/**
 * src/lib/validation/index.ts
 *
 * Lightweight, production-grade validation utilities for StockIN
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  // Accepts standard 10-digit Indian numbers with optional country code (+91)
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned);
}

export function isValidGSTIN(gstin: string): boolean {
  // Indian GSTIN format: 2 digits (state code) + 10 char PAN + 1 entity code + 1 'Z' + 1 check digit
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
}

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

export function isNonNegativeNumber(val: number | string): boolean {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return !isNaN(n) && n >= 0;
}

export function isPositiveNumber(val: number | string): boolean {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return !isNaN(n) && n > 0;
}
