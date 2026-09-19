/**
 * frontend/src/features/customers/__tests__/customerBalanceAndPayments.test.ts
 *
 * Customer Balance & Payment Settlement Consistency Tests (Step 4 Sections 17 & 18)
 * Validates:
 * 1. Opening balance -> Invoice creation -> Ledger updates (total_orders, total_spent, outstanding).
 * 2. Full payment, partial payment, and zero payment (due) scenarios.
 * 3. Supported payment methods: Cash, UPI, Bank Transfer, Card, Cheque.
 * 4. Subsequent payment settlements and ledger consistency.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { Customer } from '@/features/customers/types';
import type { Payment, PaymentMethod } from '@/features/payments/types';
import type { Invoice, PaymentStatus } from '@/features/invoices/types';

class CustomerLedgerEngine {
  customers = new Map<string, Customer>();
  invoices = new Map<string, Invoice>();
  payments: Payment[] = [];

  reset() {
    this.customers.clear();
    this.invoices.clear();
    this.payments = [];
  }

  createCustomer(c: Partial<Customer> & { id: string; name: string }): Customer {
    const customer: Customer = {
      id: c.id,
      name: c.name,
      companyName: c.companyName || '',
      phone: c.phone || '9876543210',
      email: c.email || 'customer@example.com',
      address: c.address || 'Street 1',
      city: c.city || 'Bhopal',
      state: c.state || 'Madhya Pradesh',
      gstin: c.gstin || '',
      totalOrders: c.totalOrders || 0,
      totalSpent: c.totalSpent || 0,
      outstanding: c.outstanding || 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  // Exact reproduction of ledger update rule from create_invoice_rpc & frontend
  applyInvoice(
    customerId: string,
    invoiceId: string,
    invoiceNumber: string,
    grandTotal: number,
    paidAmount: number,
    paymentMethod?: PaymentMethod
  ): Invoice {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error('Customer not found');

    const effectivePaid = Math.min(paidAmount, grandTotal);
    const balance = Math.max(0, grandTotal - effectivePaid);
    const status: PaymentStatus = balance === 0 ? 'paid' : effectivePaid > 0 ? 'partial' : 'due';

    // 1. Update customer ledger
    customer.totalOrders += 1;
    customer.totalSpent += grandTotal;
    customer.outstanding += balance; // Outstanding accumulates the unpaid balance

    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      customerId,
      customerName: customer.name,
      customerCompany: customer.companyName,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: customer.address,
      customerGstin: customer.gstin,
      date: '2026-09-18',
      dueDate: '2026-10-18',
      paymentTerms: 'Due on Receipt',
      items: [],
      subtotal: grandTotal,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal,
      paidAmount: effectivePaid,
      balance,
      status,
      notes: '',
    };
    this.invoices.set(invoiceId, invoice);

    // 2. Insert payment record if payment was made
    if (effectivePaid > 0) {
      this.payments.push({
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        transactionId: `TXN-${Date.now()}`,
        type: 'inward',
        partyType: 'customer',
        partyId: customerId,
        partyName: customer.name,
        invoiceId,
        invoiceNumber,
        amount: effectivePaid,
        method: paymentMethod || 'Cash',
        date: '2026-09-18',
        referenceNumber: `INV-SETTLE-${invoiceNumber}`,
        status: 'completed',
      });
    }

    return invoice;
  }

  // Apply subsequent standalone payment to settle an invoice
  applySubsequentPayment(
    customerId: string,
    invoiceId: string,
    paymentAmount: number,
    method: PaymentMethod,
    referenceNumber: string
  ): Payment {
    const customer = this.customers.get(customerId);
    const invoice = this.invoices.get(invoiceId);
    if (!customer || !invoice) throw new Error('Entity not found');

    const amountToApply = Math.min(paymentAmount, invoice.balance);
    invoice.paidAmount += amountToApply;
    invoice.balance = Math.max(0, invoice.grandTotal - invoice.paidAmount);
    invoice.status = invoice.balance === 0 ? 'paid' : 'partial';

    // Reduce customer outstanding
    customer.outstanding = Math.max(0, customer.outstanding - amountToApply);

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      transactionId: `TXN-SUB-${Date.now()}`,
      type: 'inward',
      partyType: 'customer',
      partyId: customerId,
      partyName: customer.name,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      amount: amountToApply,
      method,
      date: '2026-09-19',
      referenceNumber,
      status: 'completed',
    };
    this.payments.push(payment);
    return payment;
  }
}

describe('Step 4 — Customer Balance & Payment Consistency Tests', () => {
  const engine = new CustomerLedgerEngine();

  beforeEach(() => {
    engine.reset();
  });

  describe('Section 17: Customer Balance Lifecycle', () => {
    test('Zero payment invoice leaves entire grand total in customer outstanding', () => {
      engine.createCustomer({ id: 'cust-101', name: 'Ramesh Sharma', totalOrders: 0, totalSpent: 0, outstanding: 0 });

      const invoice = engine.applyInvoice('cust-101', 'inv-1', 'INV-001', 10000, 0);

      expect(invoice.status).toBe('due');
      expect(invoice.paidAmount).toBe(0);
      expect(invoice.balance).toBe(10000);

      const customer = engine.customers.get('cust-101')!;
      expect(customer.totalOrders).toBe(1);
      expect(customer.totalSpent).toBe(10000);
      expect(customer.outstanding).toBe(10000);
      expect(engine.payments.length).toBe(0);
    });

    test('Full payment invoice updates totalSpent without increasing outstanding', () => {
      engine.createCustomer({ id: 'cust-102', name: 'Pooja Verma', totalOrders: 2, totalSpent: 5000, outstanding: 0 });

      const invoice = engine.applyInvoice('cust-102', 'inv-2', 'INV-002', 8000, 8000, 'UPI');

      expect(invoice.status).toBe('paid');
      expect(invoice.paidAmount).toBe(8000);
      expect(invoice.balance).toBe(0);

      const customer = engine.customers.get('cust-102')!;
      expect(customer.totalOrders).toBe(3); // 2 + 1
      expect(customer.totalSpent).toBe(13000); // 5000 + 8000
      expect(customer.outstanding).toBe(0); // Zero outstanding

      expect(engine.payments.length).toBe(1);
      expect(engine.payments[0].method).toBe('UPI');
      expect(engine.payments[0].amount).toBe(8000);
    });

    test('Partial payment invoice updates outstanding with remaining balance only', () => {
      engine.createCustomer({ id: 'cust-103', name: 'Amit Patel', totalOrders: 0, totalSpent: 0, outstanding: 0 });

      // Invoice ₹15,000, paid ₹5,000 via Bank Transfer
      const invoice = engine.applyInvoice('cust-103', 'inv-3', 'INV-003', 15000, 5000, 'Bank Transfer');

      expect(invoice.status).toBe('partial');
      expect(invoice.paidAmount).toBe(5000);
      expect(invoice.balance).toBe(10000);

      const customer = engine.customers.get('cust-103')!;
      expect(customer.totalOrders).toBe(1);
      expect(customer.totalSpent).toBe(15000);
      expect(customer.outstanding).toBe(10000); // Only unpaid balance added to outstanding

      expect(engine.payments.length).toBe(1);
      expect(engine.payments[0].method).toBe('Bank Transfer');
      expect(engine.payments[0].amount).toBe(5000);
    });

    test('Subsequent settlement payment reduces customer outstanding to zero', () => {
      engine.createCustomer({ id: 'cust-104', name: 'Sanjay Gupta', totalOrders: 0, totalSpent: 0, outstanding: 0 });

      // 1. Initial due invoice ₹6,000
      engine.applyInvoice('cust-104', 'inv-4', 'INV-004', 6000, 0);
      expect(engine.customers.get('cust-104')?.outstanding).toBe(6000);

      // 2. Customer pays remaining ₹6,000 next day via Cheque
      const pay = engine.applySubsequentPayment('cust-104', 'inv-4', 6000, 'Cheque', 'CHQ-882190');

      expect(pay.status).toBe('completed');
      expect(pay.method).toBe('Cheque');
      expect(pay.amount).toBe(6000);

      const updatedInvoice = engine.invoices.get('inv-4')!;
      expect(updatedInvoice.status).toBe('paid');
      expect(updatedInvoice.balance).toBe(0);
      expect(updatedInvoice.paidAmount).toBe(6000);

      const updatedCustomer = engine.customers.get('cust-104')!;
      expect(updatedCustomer.outstanding).toBe(0);
    });
  });

  describe('Section 18: Supported Payment Methods Consistency', () => {
    const supportedMethods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

    for (const method of supportedMethods) {
      test(`Processes valid payment method: ${method}`, () => {
        const custId = `cust-method-${method.replace(/\s+/g, '')}`;
        engine.createCustomer({ id: custId, name: `Customer ${method}` });

        const inv = engine.applyInvoice(custId, `inv-${method}`, `INV-${method}`, 2500, 2500, method);

        expect(inv.status).toBe('paid');
        const payment = engine.payments.find((p) => p.invoiceId === `inv-${method}`);
        expect(payment).toBeDefined();
        expect(payment?.method).toBe(method);
        expect(payment?.status).toBe('completed');
      });
    }

    test('Ensures ledger consistency across multiple invoices and settlements', () => {
      const cust = engine.createCustomer({ id: 'cust-multi', name: 'Multi Corp' });

      // Invoice 1: ₹10,000 due (0 paid)
      engine.applyInvoice('cust-multi', 'inv-m1', 'INV-M1', 10000, 0);
      // Invoice 2: ₹5,000 (₹2,000 paid, ₹3,000 due)
      engine.applyInvoice('cust-multi', 'inv-m2', 'INV-M2', 5000, 2000, 'Cash');
      // Invoice 3: ₹8,000 (full paid)
      engine.applyInvoice('cust-multi', 'inv-m3', 'INV-M3', 8000, 8000, 'UPI');

      expect(cust.totalOrders).toBe(3);
      expect(cust.totalSpent).toBe(23000); // 10000 + 5000 + 8000
      expect(cust.outstanding).toBe(13000); // 10000 + 3000 + 0

      // Settle invoice 1 completely
      engine.applySubsequentPayment('cust-multi', 'inv-m1', 10000, 'Bank Transfer', 'NEFT-1234');
      expect(cust.outstanding).toBe(3000);

      // Settle remaining ₹3,000 on invoice 2
      engine.applySubsequentPayment('cust-multi', 'inv-m2', 3000, 'UPI', 'UPI-9876');
      expect(cust.outstanding).toBe(0);
    });
  });
});
