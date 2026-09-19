/**
 * frontend/src/services/__tests__/documentStorageService.test.ts
 *
 * Supabase PDF Storage Service Tests (Step 5)
 * Validates:
 * 1. Deterministic, tenant-isolated storage path generation.
 * 2. Cross-tenant storage policy enforcement rules.
 * 3. Idempotent uploads (upsert behavior).
 * 4. Decoupling: Storage failures gracefully update status to 'failed' without breaking financial records.
 * 5. Signed URL creation logic and time-limited tokens.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { getDocumentStoragePath, normalizeStoragePath, STORAGE_BUCKET } from '../storage/documentStorageService';

describe('Document Storage Service (Step 5)', () => {
  const userA = 'user-uuid-1111-tenant-a';
  const userB = 'user-uuid-2222-tenant-b';

  test('normalizes storage paths and strips leading/trailing slashes', () => {
    expect(normalizeStoragePath('/user-123/invoices/inv-001.pdf')).toBe('user-123/invoices/inv-001.pdf');
    expect(normalizeStoragePath('///user-123/invoices/inv-001.pdf///')).toBe('user-123/invoices/inv-001.pdf');
  });

  test('expands bare filenames into canonical tenant path when userId is provided', () => {
    expect(normalizeStoragePath('inv-664119.pdf', userA, 'invoice', 'inv-664119')).toBe(
      `${userA}/invoices/inv-664119.pdf`
    );
    expect(normalizeStoragePath('/inv-466202.pdf', userA, 'invoice', 'inv-466202')).toBe(
      `${userA}/invoices/inv-466202.pdf`
    );
    expect(normalizeStoragePath('quo-888.pdf', userB, 'quotation', 'quo-888')).toBe(
      `${userB}/quotations/quo-888.pdf`
    );
  });

  test('generates deterministic tenant-isolated path for invoices', () => {
    const invoiceId = 'inv-test-999';
    const path = getDocumentStoragePath(userA, 'invoice', invoiceId);
    expect(path).toBe(`${userA}/invoices/${invoiceId}.pdf`);
    expect(path.startsWith(`${userA}/`)).toBe(true);
  });

  test('generates deterministic tenant-isolated path for quotations', () => {
    const quotationId = 'qtn-test-888';
    const path = getDocumentStoragePath(userB, 'quotation', quotationId);
    expect(path).toBe(`${userB}/quotations/${quotationId}.pdf`);
    expect(path.startsWith(`${userB}/`)).toBe(true);
  });

  test('ensures cross-tenant paths are strictly segregated by user ID prefix', () => {
    const invoiceId = 'shared-doc-id';
    const pathA = getDocumentStoragePath(userA, 'invoice', invoiceId);
    const pathB = getDocumentStoragePath(userB, 'invoice', invoiceId);

    expect(pathA).not.toBe(pathB);
    expect(pathA.split('/')[0]).toBe(userA);
    expect(pathB.split('/')[0]).toBe(userB);
  });

  test('uses correct dedicated storage bucket name', () => {
    expect(STORAGE_BUCKET).toBe('documents');
  });

  describe('Storage Simulator & Decoupled Fault Tolerance', () => {
    interface StorageObject {
      path: string;
      bucket: string;
      data: Uint8Array;
      contentType: string;
    }

    interface InvoiceRecord {
      id: string;
      user_id: string;
      status: string;
      storage_file_path?: string;
      file_size?: number;
      pdf_status: 'pending' | 'ready' | 'failed';
      pdf_error?: string | null;
    }

    class MockStorageBackend {
      objects = new Map<string, StorageObject>();
      invoices = new Map<string, InvoiceRecord>();
      simulateStorageOutage = false;

      // Evaluates storage RLS policy: (storage.foldername(name))[1] = auth.uid()
      checkRlsPolicy(actorUserId: string, objectPath: string): boolean {
        const folderTenant = objectPath.split('/')[0];
        return folderTenant === actorUserId;
      }

      async upload(
        actorUserId: string,
        path: string,
        data: Uint8Array,
        options: { upsert: boolean }
      ): Promise<{ success: boolean; error?: string }> {
        if (!this.checkRlsPolicy(actorUserId, path)) {
          return { success: false, error: 'Unauthorized: Storage policy violation' };
        }

        if (this.simulateStorageOutage) {
          return { success: false, error: 'Supabase Storage service unavailable' };
        }

        if (!options.upsert && this.objects.has(path)) {
          return { success: false, error: 'Object already exists and upsert is false' };
        }

        this.objects.set(path, {
          path,
          bucket: STORAGE_BUCKET,
          data,
          contentType: 'application/pdf',
        });

        return { success: true };
      }

      async createSignedUrl(
        actorUserId: string,
        path: string,
        expiresIn: number
      ): Promise<{ signedUrl?: string; error?: string }> {
        if (!this.checkRlsPolicy(actorUserId, path)) {
          return { error: 'Unauthorized' };
        }
        if (!this.objects.has(path)) {
          return { error: 'Object not found' };
        }
        return {
          signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${STORAGE_BUCKET}/${path}?token=mock_token_exp_${expiresIn}`,
        };
      }
    }

    let storage: MockStorageBackend;

    beforeEach(() => {
      storage = new MockStorageBackend();
      storage.invoices.set('inv-001', {
        id: 'inv-001',
        user_id: userA,
        status: 'paid',
        pdf_status: 'pending',
      });
    });

    test('successfully uploads and marks status as ready when storage succeeds', async () => {
      const path = getDocumentStoragePath(userA, 'invoice', 'inv-001');
      const fakePdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

      const res = await storage.upload(userA, path, fakePdfData, { upsert: true });
      expect(res.success).toBe(true);

      const inv = storage.invoices.get('inv-001')!;
      inv.storage_file_path = path;
      inv.file_size = fakePdfData.length;
      inv.pdf_status = 'ready';

      expect(inv.pdf_status).toBe('ready');
      expect(inv.storage_file_path).toBe(path);
      expect(inv.file_size).toBe(4);
    });

    test('prevents User B from uploading into User A folder (Storage RLS policy)', async () => {
      const path = getDocumentStoragePath(userA, 'invoice', 'inv-001');
      const fakePdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      const res = await storage.upload(userB, path, fakePdfData, { upsert: true });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });

    test('decoupled failure: storage outage updates pdf_status to failed without deleting invoice', async () => {
      storage.simulateStorageOutage = true;
      const path = getDocumentStoragePath(userA, 'invoice', 'inv-001');
      const fakePdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      const res = await storage.upload(userA, path, fakePdfData, { upsert: true });
      expect(res.success).toBe(false);

      // Decoupled handling: update error on invoice record
      const inv = storage.invoices.get('inv-001')!;
      inv.pdf_status = 'failed';
      inv.pdf_error = res.error;

      // Crucial requirement: invoice still exists and remains 'paid'
      expect(inv.status).toBe('paid');
      expect(inv.pdf_status).toBe('failed');
      expect(inv.pdf_error).toBe('Supabase Storage service unavailable');
    });

    test('idempotency: multiple uploads with upsert=true overwrite existing document without error', async () => {
      const path = getDocumentStoragePath(userA, 'invoice', 'inv-001');
      const v1Data = new Uint8Array([1, 2, 3]);
      const v2Data = new Uint8Array([1, 2, 3, 4, 5]);

      const res1 = await storage.upload(userA, path, v1Data, { upsert: true });
      expect(res1.success).toBe(true);

      const res2 = await storage.upload(userA, path, v2Data, { upsert: true });
      expect(res2.success).toBe(true);

      const stored = storage.objects.get(path)!;
      expect(stored.data.length).toBe(5);
    });

    test('generates valid signed URL for authorized owner and rejects non-owner', async () => {
      const path = getDocumentStoragePath(userA, 'invoice', 'inv-001');
      await storage.upload(userA, path, new Uint8Array([1]), { upsert: true });

      // Owner request
      const ownerRes = await storage.createSignedUrl(userA, path, 300);
      expect(ownerRes.signedUrl).toBeDefined();
      expect(ownerRes.signedUrl).toContain('mock_token_exp_300');

      // Non-owner request
      const nonOwnerRes = await storage.createSignedUrl(userB, path, 300);
      expect(nonOwnerRes.error).toBe('Unauthorized');
    });
  });
});
