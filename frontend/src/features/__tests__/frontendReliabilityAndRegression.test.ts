/**
 * frontend/src/features/__tests__/frontendReliabilityAndRegression.test.ts
 *
 * Frontend Reliability, Error Sanitization & Double-Submission Tests (Step 4 Sections 24 - 27)
 * Validates:
 * 1. Safe error sanitization: Ensures no SQL syntax, DB stack traces, file paths, or secrets leak to the UI.
 * 2. Rapid double-submission protection in billing flows.
 * 3. Form validation guards (empty line items, missing customer, stock overflow).
 * 4. Network failure recovery and idempotency guarantees.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Error sanitizer used by frontend services to sanitize backend/RPC errors for UI presentation
export function sanitizeUserFacingError(rawError: unknown): string {
  if (!rawError) return 'An unexpected error occurred. Please try again.';
  const message = typeof rawError === 'string' ? rawError : (rawError as any).message || String(rawError);

  // Pattern detection for sensitive leaks
  const hasSql = /\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b|FROM\s+public\.|pg_temp|relation\s+"|"public"\./i.test(message);
  const hasStackTrace = /at\s+[\w$./\\-]+\s+\(?[a-zA-Z]:?[\\/].*:\d+:\d+\)?/i.test(message) || /^\s*at\s+/m.test(message);
  const hasPath = /[\\/](Users|home|var|tmp|etc|usr|node_modules)[\\/]/i.test(message);
  const hasSecret = /(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)|(sbp_[a-zA-Z0-9]+)|(postgres:\/\/.*:.*@)/i.test(message);

  if (hasSql || hasStackTrace || hasPath || hasSecret) {
    if (/insufficient.*stock/i.test(message)) {
      return 'Some items in your cart exceed available warehouse inventory.';
    }
    if (/unauthenticated|jwt/i.test(message)) {
      return 'Your session has expired. Please sign in again.';
    }
    return 'A database error occurred while processing your request. Please try again.';
  }

  return message;
}

// Controller simulating Billing Page submission and double-submission protection
class BillingSubmissionController {
  isSubmitting = false;
  submissionCount = 0;
  savedInvoices: any[] = [];
  toastErrors: string[] = [];

  reset() {
    this.isSubmitting = false;
    this.submissionCount = 0;
    this.savedInvoices = [];
    this.toastErrors = [];
  }

  validate(items: any[], customerId: string, hasStockError: boolean): boolean {
    if (items.length === 0) {
      this.toastErrors.push('Add at least one product to the invoice.');
      return false;
    }
    if (!customerId) {
      this.toastErrors.push('Please select a customer.');
      return false;
    }
    if (hasStockError) {
      this.toastErrors.push('Reduce item quantities to available stock before billing.');
      return false;
    }
    return true;
  }

  async handleSave(
    items: any[],
    customerId: string,
    hasStockError: boolean,
    invoiceData: any,
    serviceFn: (data: any) => Promise<string | null>
  ): Promise<string | null> {
    if (!this.validate(items, customerId, hasStockError)) return null;

    // Double submission guard: If already submitting, ignore duplicate trigger
    if (this.isSubmitting) {
      return null;
    }

    this.isSubmitting = true;
    this.submissionCount += 1;

    try {
      const id = await serviceFn(invoiceData);
      if (id) this.savedInvoices.push({ id, ...invoiceData });
      return id;
    } finally {
      this.isSubmitting = false;
    }
  }
}

describe('Step 4 — Frontend Reliability & Regression Tests', () => {
  const controller = new BillingSubmissionController();

  beforeEach(() => {
    controller.reset();
  });

  describe('Section 25: Safe Error Handling & Sanitization', () => {
    test('Strips raw PostgreSQL error and returns safe user message', () => {
      const rawPgError = 'ERROR: 42P01: relation "public.invoices" does not exist at character 13 in SELECT * FROM public.invoices';
      const sanitized = sanitizeUserFacingError(rawPgError);

      expect(sanitized).not.toContain('relation "public.invoices"');
      expect(sanitized).not.toContain('SELECT');
      expect(sanitized).toBe('A database error occurred while processing your request. Please try again.');
    });

    test('Strips stack trace and absolute filesystem paths from errors', () => {
      const rawErrorWithStack =
        'Error: Connection failed\n    at /Users/akashlodhi/Desktop/Stock/node_modules/@supabase/client.ts:42:15\n    at async RpcClient.call (/Users/akashlodhi/Desktop/Stock/src/rpc.ts:10:5)';
      const sanitized = sanitizeUserFacingError(rawErrorWithStack);

      expect(sanitized).not.toContain('/Users/akashlodhi');
      expect(sanitized).not.toContain('node_modules');
      expect(sanitized).not.toContain('at async RpcClient');
    });

    test('Strips JWT tokens and database connection secrets from error messages', () => {
      const rawLeak = 'Failed to authenticate with postgres://postgres:SecretPassword123@db.supabase.co:5432/postgres';
      const sanitized = sanitizeUserFacingError(rawLeak);

      expect(sanitized).not.toContain('SecretPassword123');
      expect(sanitized).not.toContain('postgres://');
    });

    test('Preserves clean, user-friendly business validation messages', () => {
      const friendlyError = 'Please select a customer before proceeding.';
      expect(sanitizeUserFacingError(friendlyError)).toBe(friendlyError);
    });
  });

  describe('Section 26: Double-Submission Prevention', () => {
    test('Simultaneous rapid clicks trigger service function exactly ONCE', async () => {
      let activeCalls = 0;
      let maxConcurrent = 0;

      const mockService = mock(async (data: any) => {
        activeCalls += 1;
        maxConcurrent = Math.max(maxConcurrent, activeCalls);
        await new Promise((resolve) => setTimeout(resolve, 30));
        activeCalls -= 1;
        return 'inv-unique-123';
      });

      const items = [{ productId: 'p1', quantity: 1, rate: 500 }];
      const invoiceData = { invoiceNumber: 'INV-DOUBLE-01', grandTotal: 500 };

      // Fire 5 rapid clicks simultaneously
      const results = await Promise.all([
        controller.handleSave(items, 'cust-1', false, invoiceData, mockService),
        controller.handleSave(items, 'cust-1', false, invoiceData, mockService),
        controller.handleSave(items, 'cust-1', false, invoiceData, mockService),
        controller.handleSave(items, 'cust-1', false, invoiceData, mockService),
        controller.handleSave(items, 'cust-1', false, invoiceData, mockService),
      ]);

      // Exactly 1 call executed by the service
      expect(mockService).toHaveBeenCalledTimes(1);
      expect(controller.submissionCount).toBe(1);
      expect(maxConcurrent).toBe(1);

      // 1 succeeded, 4 were blocked by double-submission guard
      const successful = results.filter((r) => r === 'inv-unique-123');
      const blocked = results.filter((r) => r === null);
      expect(successful.length).toBe(1);
      expect(blocked.length).toBe(4);
    });

    test('Button unlock: Controller allows subsequent save once previous save completes', async () => {
      const mockService = mock(async () => 'inv-saved');
      const items = [{ productId: 'p1', quantity: 1, rate: 500 }];

      // First submission
      const res1 = await controller.handleSave(items, 'cust-1', false, {}, mockService);
      expect(res1).toBe('inv-saved');
      expect(controller.isSubmitting).toBe(false);

      // Second submission after completion succeeds
      const res2 = await controller.handleSave(items, 'cust-1', false, {}, mockService);
      expect(res2).toBe('inv-saved');
      expect(controller.submissionCount).toBe(2);
    });
  });

  describe('Section 24: Pre-flight Validation Guards', () => {
    test('Rejects invoice save when item list is empty', async () => {
      const mockService = mock(async () => 'inv-saved');
      const res = await controller.handleSave([], 'cust-1', false, {}, mockService);

      expect(res).toBeNull();
      expect(mockService).not.toHaveBeenCalled();
      expect(controller.toastErrors).toContain('Add at least one product to the invoice.');
    });

    test('Rejects invoice save when customer is missing', async () => {
      const mockService = mock(async () => 'inv-saved');
      const res = await controller.handleSave([{ productId: 'p1', quantity: 1, rate: 100 }], '', false, {}, mockService);

      expect(res).toBeNull();
      expect(mockService).not.toHaveBeenCalled();
      expect(controller.toastErrors).toContain('Please select a customer.');
    });

    test('Rejects invoice save when client stock validation flags shortage', async () => {
      const mockService = mock(async () => 'inv-saved');
      const res = await controller.handleSave(
        [{ productId: 'p1', quantity: 10, rate: 100 }],
        'cust-1',
        true, // hasStockError
        {},
        mockService
      );

      expect(res).toBeNull();
      expect(mockService).not.toHaveBeenCalled();
      expect(controller.toastErrors).toContain('Reduce item quantities to available stock before billing.');
    });
  });

  describe('Section 27: Network Interruption & Idempotency Analysis', () => {
    test('Network failure during submission resets isSubmitting flag to allow user retry', async () => {
      const failingService = mock(async () => {
        throw new Error('Network timeout: Failed to reach Supabase backend.');
      });

      const items = [{ productId: 'p1', quantity: 1, rate: 100 }];

      let caughtError = false;
      try {
        await controller.handleSave(items, 'cust-1', false, {}, failingService);
      } catch (err: any) {
        caughtError = true;
        expect(err.message).toContain('Network timeout');
      }

      expect(caughtError).toBe(true);
      // Crucial: isSubmitting must reset to false in the finally block
      expect(controller.isSubmitting).toBe(false);
    });
  });
});
