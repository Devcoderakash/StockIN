/**
 * src/features/invoices/utils/invoiceCalculations.ts
 *
 * Centralized financial calculations for Invoices and Quotations
 */

export interface CalculationLineItem {
  quantity: number;
  rate: number;
  discountPercent: number;
  taxRate: number;
  taxAmount?: number;
  amount?: number;
}

export interface CalculatedTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  taxTotal: number;
  grandTotal: number;
}

/**
 * Calculates tax and total for an individual line item
 */
export function calculateLineItem(
  quantity: number,
  rate: number,
  discountPercent: number,
  taxRate: number
): { discountAmount: number; taxableAmount: number; taxAmount: number; totalAmount: number } {
  const base = quantity * rate;
  const discountAmount = (base * (discountPercent || 0)) / 100;
  const taxableAmount = Math.max(0, base - discountAmount);
  const taxAmount = (taxableAmount * (taxRate || 0)) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Computes consolidated totals across an array of line items
 */
export function calculateTotals(items: CalculationLineItem[]): CalculatedTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const base = item.quantity * item.rate;
    const disc = (base * (item.discountPercent || 0)) / 100;
    const taxable = Math.max(0, base - disc);
    const tax = (taxable * (item.taxRate || 0)) / 100;

    subtotal += base;
    discountTotal += disc;
    taxTotal += tax;
  }

  const taxableAmount = Math.max(0, subtotal - discountTotal);
  // Default equal split for CGST and SGST (intra-state standard)
  const halfTax = Math.round((taxTotal / 2) * 100) / 100;
  const grandTotal = Math.round(taxableAmount + taxTotal);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: halfTax,
    sgst: halfTax,
    taxTotal: Math.round(taxTotal * 100) / 100,
    grandTotal,
  };
}
