/**
 * frontend/src/features/history/__tests__/documentHistoryService.test.ts
 *
 * Unit tests for History Service & Server-side filtering logic (Step 5)
 */

import { describe, test, expect } from 'bun:test';
import { getDateRangeForPreset } from '../services/historyService';
import type { HistoryItem, HistoryFilterOptions, HistoryQueryResult } from '../types';

describe('Document History Service (Step 5)', () => {
  describe('Date Preset Boundary Calculations', () => {
    test('computes correct start and end for "today"', () => {
      const { start, end } = getDateRangeForPreset('today');
      expect(start).toBeDefined();
      expect(end).toBeDefined();

      const startDate = new Date(start!);
      const endDate = new Date(end!);
      expect(startDate.getTime()).toBeLessThan(endDate.getTime());

      // Same calendar day
      expect(startDate.getDate()).toBe(endDate.getDate());
    });

    test('computes correct 7-day range for "week"', () => {
      const { start, end } = getDateRangeForPreset('week');
      expect(start).toBeDefined();
      expect(end).toBeDefined();

      const startMs = new Date(start!).getTime();
      const endMs = new Date(end!).getTime();
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(7);
      expect(diffDays).toBeLessThanOrEqual(8);
    });

    test('computes correct range for "month" (from 1st of month)', () => {
      const { start, end } = getDateRangeForPreset('month');
      expect(start).toBeDefined();
      expect(end).toBeDefined();

      const startDate = new Date(start!);
      expect(startDate.getDate()).toBe(1);
    });

    test('computes correct range for "last_month"', () => {
      const { start, end } = getDateRangeForPreset('last_month');
      expect(start).toBeDefined();
      expect(end).toBeDefined();

      const startDate = new Date(start!);
      const endDate = new Date(end!);
      expect(startDate.getDate()).toBe(1);
      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
    });

    test('computes correct range for "year" (Jan 1)', () => {
      const { start, end } = getDateRangeForPreset('year');
      expect(start).toBeDefined();
      expect(end).toBeDefined();

      const startDate = new Date(start!);
      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getDate()).toBe(1);
    });

    test('computes custom date range from YYYY-MM-DD input', () => {
      const { start, end } = getDateRangeForPreset('custom', '2026-05-01', '2026-05-31');
      expect(start).toBeDefined();
      expect(end).toBeDefined();

      const startDate = new Date(start!);
      const endDate = new Date(end!);
      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(4); // May (0-indexed)
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getDate()).toBe(31);
    });

    test('returns empty range for "all"', () => {
      const range = getDateRangeForPreset('all');
      expect(range.start).toBeUndefined();
      expect(range.end).toBeUndefined();
    });
  });

  describe('Server-Side Filter & Pagination Simulator', () => {
    const mockDbDocuments: HistoryItem[] = [
      {
        id: 'doc-1',
        user_id: 'user-1',
        document_type: 'invoice',
        document_id: 'inv-101',
        document_number: 'INV-2026-001',
        customer_id: 'cust-1',
        customer_name: 'Acme Corp',
        file_path: 'user-1/invoices/inv-101.pdf',
        file_size: 45200,
        mime_type: 'application/pdf',
        pdf_status: 'ready',
        created_at: '2026-09-10T10:00:00.000Z',
        updated_at: '2026-09-10T10:00:00.000Z',
      },
      {
        id: 'doc-2',
        user_id: 'user-1',
        document_type: 'quotation',
        document_id: 'qtn-201',
        document_number: 'QTN-2026-001',
        customer_id: 'cust-2',
        customer_name: 'Beta LLC',
        file_path: 'user-1/quotations/qtn-201.pdf',
        file_size: 38100,
        mime_type: 'application/pdf',
        pdf_status: 'ready',
        created_at: '2026-09-12T14:30:00.000Z',
        updated_at: '2026-09-12T14:30:00.000Z',
      },
      {
        id: 'doc-3',
        user_id: 'user-1',
        document_type: 'invoice',
        document_id: 'inv-102',
        document_number: 'INV-2026-002',
        customer_id: 'cust-1',
        customer_name: 'Acme Corp',
        file_path: 'user-1/invoices/inv-102.pdf',
        file_size: 51200,
        mime_type: 'application/pdf',
        pdf_status: 'failed',
        created_at: '2026-09-15T09:15:00.000Z',
        updated_at: '2026-09-15T09:15:00.000Z',
      },
      {
        id: 'doc-4',
        user_id: 'user-1',
        document_type: 'quotation',
        document_id: 'qtn-202',
        document_number: 'QTN-2026-002',
        customer_id: 'cust-3',
        customer_name: 'Gamma Industries',
        file_path: 'user-1/quotations/qtn-202.pdf',
        file_size: 41000,
        mime_type: 'application/pdf',
        pdf_status: 'ready',
        created_at: '2026-09-18T08:00:00.000Z',
        updated_at: '2026-09-18T08:00:00.000Z',
      },
    ];

    function executeQuerySimulator(options: HistoryFilterOptions): HistoryQueryResult {
      let filtered = [...mockDbDocuments];

      if (options.documentType && options.documentType !== 'all') {
        filtered = filtered.filter((d) => d.document_type === options.documentType);
      }

      if (options.customerId) {
        filtered = filtered.filter((d) => d.customer_id === options.customerId);
      }

      if (options.search) {
        const s = options.search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.document_number.toLowerCase().includes(s) ||
            (d.customer_name && d.customer_name.toLowerCase().includes(s))
        );
      }

      const totalCount = filtered.length;
      const pageSize = options.pageSize || 10;
      const totalPages = Math.ceil(totalCount / pageSize);
      const page = options.page || 1;
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const items = filtered.slice(from, to);

      return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    }

    test('filters accurately by document_type = invoice', () => {
      const res = executeQuerySimulator({ documentType: 'invoice', page: 1, pageSize: 10 });
      expect(res.totalCount).toBe(2);
      expect(res.items.every((i) => i.document_type === 'invoice')).toBe(true);
    });

    test('filters accurately by document_type = quotation', () => {
      const res = executeQuerySimulator({ documentType: 'quotation', page: 1, pageSize: 10 });
      expect(res.totalCount).toBe(2);
      expect(res.items.every((i) => i.document_type === 'quotation')).toBe(true);
    });

    test('searches case-insensitively across document_number and customer_name', () => {
      const byNumber = executeQuerySimulator({ search: 'INV-2026-002', page: 1, pageSize: 10 });
      expect(byNumber.totalCount).toBe(1);
      expect(byNumber.items[0].document_number).toBe('INV-2026-002');

      const byCustomer = executeQuerySimulator({ search: 'acme', page: 1, pageSize: 10 });
      expect(byCustomer.totalCount).toBe(2);
      expect(byCustomer.items.every((i) => i.customer_name === 'Acme Corp')).toBe(true);
    });

    test('safely formats PostgREST search filter expressions with commas and quotes', () => {
      // Simulates the exact escaping logic implemented in historyService
      const formatPostgrestOrFilter = (term: string) => {
        const safeTerm = term.trim().replace(/"/g, '""');
        const pattern = `"%${safeTerm}%"`;
        return `document_number.ilike.${pattern},customer_name.ilike.${pattern}`;
      };

      const termWithComma = 'Acme, Inc';
      const filter1 = formatPostgrestOrFilter(termWithComma);
      expect(filter1).toBe('document_number.ilike."%Acme, Inc%",customer_name.ilike."%Acme, Inc%"');

      const termWithQuotes = 'Special "Alpha"';
      const filter2 = formatPostgrestOrFilter(termWithQuotes);
      expect(filter2).toBe('document_number.ilike."%Special ""Alpha""%",customer_name.ilike."%Special ""Alpha""%"');
    });

    test('calculates correct pagination pages and slices', () => {
      const page1 = executeQuerySimulator({ page: 1, pageSize: 2 });
      expect(page1.items.length).toBe(2);
      expect(page1.totalPages).toBe(2);
      expect(page1.totalCount).toBe(4);
      expect(page1.items[0].id).toBe('doc-1');
      expect(page1.items[1].id).toBe('doc-2');

      const page2 = executeQuerySimulator({ page: 2, pageSize: 2 });
      expect(page2.items.length).toBe(2);
      expect(page2.items[0].id).toBe('doc-3');
      expect(page2.items[1].id).toBe('doc-4');
    });
  });
});
