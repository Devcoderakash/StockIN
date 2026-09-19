/**
 * frontend/src/utils/__tests__/financialCalculations.test.ts
 *
 * Unit Tests for Pure Business & Financial Utilities (Step 4 Sections 3 & 4)
 * Covers: currency calculations, subtotal, discount, tax, invoice totals,
 * quotation totals, money/rounding, Indian number formatting, and numberToWords.
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateLineItem,
  calculateTotals,
  type CalculationLineItem,
} from '@/features/invoices/utils/invoiceCalculations';
import {
  formatCurrency,
  formatIndianNumber,
  formatDate,
  formatDateLong,
  numberToWords,
} from '@/utils/formatters';

describe('Unit Tests: Pure Financial & Business Utilities', () => {
  describe('1. Individual Line Item Calculations (calculateLineItem)', () => {
    test('Calculates standard item: ₹100 × 2 with no discount and 18% GST', () => {
      const result = calculateLineItem(2, 100, 0, 18);
      expect(result.discountAmount).toBe(0);
      expect(result.taxableAmount).toBe(200);
      expect(result.taxAmount).toBe(36);
      expect(result.totalAmount).toBe(236);
    });

    test('Calculates decimal rate: ₹99.99 × 3 with 10% discount and 18% GST', () => {
      // Base: 99.99 * 3 = 299.97
      // Disc (10%): 29.997 -> rounded to 30.00
      // Taxable: 299.97 - 29.997 = 269.973 -> rounded to 269.97
      // Tax (18%): 269.973 * 0.18 = 48.59514 -> rounded to 48.60
      // Total: 269.973 + 48.59514 = 318.56814 -> rounded to 318.57
      const result = calculateLineItem(3, 99.99, 10, 18);
      expect(result.discountAmount).toBe(30);
      expect(result.taxableAmount).toBe(269.97);
      expect(result.taxAmount).toBe(48.6);
      expect(result.totalAmount).toBe(318.57);
    });

    test('Handles zero values cleanly (zero rate, zero qty, zero tax, zero discount)', () => {
      const res1 = calculateLineItem(0, 100, 0, 18);
      expect(res1.taxableAmount).toBe(0);
      expect(res1.totalAmount).toBe(0);

      const res2 = calculateLineItem(5, 0, 0, 18);
      expect(res2.taxableAmount).toBe(0);
      expect(res2.totalAmount).toBe(0);

      const res3 = calculateLineItem(5, 100, 0, 0);
      expect(res3.discountAmount).toBe(0);
      expect(res3.taxAmount).toBe(0);
      expect(res3.totalAmount).toBe(500);
    });

    test('Prevents negative taxable amount if discount exceeds 100%', () => {
      const res = calculateLineItem(2, 500, 150, 18);
      expect(res.taxableAmount).toBe(0);
      expect(res.taxAmount).toBe(0);
      expect(res.totalAmount).toBe(0);
    });

    test('Handles large enterprise financial values deterministically', () => {
      const qty = 50000;
      const rate = 12500.5;
      // Base = 625,025,000
      const res = calculateLineItem(qty, rate, 5, 28);
      expect(res.discountAmount).toBe(31251250);
      expect(res.taxableAmount).toBe(593773750);
      expect(res.taxAmount).toBe(166256650);
      expect(res.totalAmount).toBe(760030400);
    });
  });

  describe('2. Consolidated Totals Calculations (calculateTotals)', () => {
    test('Consolidates multiple line items with GST split (CGST & SGST)', () => {
      const items: CalculationLineItem[] = [
        { quantity: 2, rate: 100, discountPercent: 0, taxRate: 18 }, // Base: 200, Tax: 36
        { quantity: 1, rate: 500, discountPercent: 10, taxRate: 18 }, // Base: 500, Disc: 50, Taxable: 450, Tax: 81
      ];

      const totals = calculateTotals(items);
      expect(totals.subtotal).toBe(700);
      expect(totals.discountTotal).toBe(50);
      expect(totals.taxableAmount).toBe(650);
      expect(totals.taxTotal).toBe(117);
      // Intra-state equal split (117 / 2 = 58.5)
      expect(totals.cgst).toBe(58.5);
      expect(totals.sgst).toBe(58.5);
      expect(totals.grandTotal).toBe(767); // 650 + 117
    });

    test('Handles empty item list returning zero totals', () => {
      const totals = calculateTotals([]);
      expect(totals.subtotal).toBe(0);
      expect(totals.discountTotal).toBe(0);
      expect(totals.taxableAmount).toBe(0);
      expect(totals.cgst).toBe(0);
      expect(totals.sgst).toBe(0);
      expect(totals.taxTotal).toBe(0);
      expect(totals.grandTotal).toBe(0);
    });

    test('Handles fractional cent taxes with deterministic rounding', () => {
      const items: CalculationLineItem[] = [
        { quantity: 3, rate: 33.33, discountPercent: 0, taxRate: 5 }, // Base 99.99, Tax: 4.9995
      ];
      const totals = calculateTotals(items);
      expect(totals.subtotal).toBe(99.99);
      expect(totals.taxTotal).toBe(5);
      expect(totals.grandTotal).toBe(105);
    });
  });

  describe('3. Currency & Indian Number Formatting (formatters)', () => {
    test('formatCurrency formats Indian Rupee symbols without decimals by default', () => {
      expect(formatCurrency(1000)).toMatch(/₹\s?1,000/);
      expect(formatCurrency(500000)).toMatch(/₹\s?5,00,000/);
      expect(formatCurrency(12345678)).toMatch(/₹\s?1,23,45,678/);
    });

    test('formatCurrency formats decimals when includeDecimals is true', () => {
      expect(formatCurrency(1250.75, true)).toMatch(/₹\s?1,250\.75/);
      expect(formatCurrency(100, true)).toMatch(/₹\s?100\.00/);
    });

    test('formatCurrency handles edge cases (0, undefined, null, NaN)', () => {
      expect(formatCurrency(0)).toMatch(/₹\s?0/);
      expect(formatCurrency(undefined)).toBe('₹0');
      expect(formatCurrency(null)).toBe('₹0');
      expect(formatCurrency(NaN)).toBe('₹0');
    });

    test('formatIndianNumber formats grouped digits in lakhs and crores', () => {
      expect(formatIndianNumber(1000)).toBe('1,000');
      expect(formatIndianNumber(100000)).toBe('1,00,000');
      expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
      expect(formatIndianNumber(0)).toBe('0');
      expect(formatIndianNumber(undefined)).toBe('0');
      expect(formatIndianNumber(null)).toBe('0');
    });
  });

  describe('4. Date Formatting (formatDate & formatDateLong)', () => {
    test('formatDate formats valid ISO string to DD/MM/YYYY', () => {
      expect(formatDate('2026-09-18')).toBe('18/09/2026');
      expect(formatDate('2026-01-05')).toBe('05/01/2026');
    });

    test('formatDate handles null, undefined, or malformed strings gracefully', () => {
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate(null)).toBe('—');
      expect(formatDate('')).toBe('—');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    test('formatDateLong formats date to readable Indian format', () => {
      const res = formatDateLong('2026-09-18');
      expect(res).toContain('18');
      expect(res).toContain('Sep');
      expect(res).toContain('2026');
      expect(formatDateLong(null)).toBe('—');
    });
  });

  describe('5. Indian Currency to Words Conversion (numberToWords)', () => {
    test('Converts zero to "Rupees Zero Only"', () => {
      expect(numberToWords(0)).toBe('Rupees Zero Only');
    });

    test('Converts units and teens', () => {
      expect(numberToWords(7)).toBe('Rupees Seven Only');
      expect(numberToWords(15)).toBe('Rupees Fifteen Only');
      expect(numberToWords(42)).toBe('Rupees Forty Two Only');
    });

    test('Converts hundreds, thousands, lakhs, and crores', () => {
      expect(numberToWords(250)).toBe('Rupees Two Hundred Fifty Only');
      expect(numberToWords(1500)).toBe('Rupees One Thousand Five Hundred Only');
      expect(numberToWords(125000)).toBe('Rupees One Lakh Twenty Five Thousand Only');
      expect(numberToWords(10000000)).toBe('Rupees One Crore Only');
      expect(numberToWords(35241680)).toBe(
        'Rupees Three Crore Fifty Two Lakh Forty One Thousand Six Hundred Eighty Only'
      );
    });

    test('Truncates decimals to whole rupee units for standard receipt wording', () => {
      expect(numberToWords(99.95)).toBe('Rupees Ninety Nine Only');
    });
  });
});
