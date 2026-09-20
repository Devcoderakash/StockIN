/**
 * src/services/pdfService.ts
 *
 * Lightweight, zero-dependency, standard PDF 1.4 vector generator.
 * Produces crisp, publication-quality A4 PDF documents for Invoices and Quotations.
 */

import type { Invoice, Quotation, BusinessSettings } from '@/types';
import { formatCurrency, formatDate, numberToWords } from '@/utils/formatters';

interface GeneratePdfOptions {
  type: 'invoice' | 'quotation';
  document: Invoice | Quotation;
  settings: BusinessSettings;
}

/**
 * Escapes standard characters for PDF text streams
 */
function escapePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/₹/g, 'Rs. ');
}

/**
 * Generates an A4 PDF 1.4 binary payload for an Invoice or Quotation
 */
export function generateDocumentPdf(options: GeneratePdfOptions): { blob: Blob; base64: string } {
  const { type, document: doc, settings } = options;
  const isInvoice = type === 'invoice';
  const inv = isInvoice ? (doc as Invoice) : null;
  const quo = !isInvoice ? (doc as Quotation) : null;

  const docNumber = isInvoice ? inv!.invoiceNumber : quo!.quotationNumber;
  const docDate = isInvoice ? formatDate(inv!.date) : formatDate(quo!.quotationDate);
  const docDueDate = isInvoice ? formatDate(inv!.dueDate) : formatDate(quo!.validUntil);

  const businessName = settings.businessName || 'StockIN Business';
  const businessAddress = `${settings.address || ''}, ${settings.city || ''} ${settings.state || ''} ${settings.pincode || ''}`.trim();
  const businessGstin = settings.gstin ? `GSTIN: ${settings.gstin}` : '';
  const businessPhone = settings.phone ? `Phone: ${settings.phone}` : '';
  const businessEmail = settings.email ? `Email: ${settings.email}` : '';

  const customerName = doc.customerName || 'Walk-in Customer';
  const customerCompany = doc.customerCompany ? `${doc.customerCompany}` : '';
  const customerAddress = doc.customerAddress ? `${doc.customerAddress}` : '';
  const customerGstin = doc.customerGstin ? `GSTIN: ${doc.customerGstin}` : '';
  const customerPhone = doc.customerPhone ? `Phone: ${doc.customerPhone}` : '';

  // Stream content instructions
  const stream: string[] = [];

  // A4 dimensions: 595.28 x 841.89 pt
  // Margins: left = 40, right = 555, top = 800, bottom = 40

  // 1. Top Header Brand Bar (Deep Navy Accent)
  stream.push('q');
  stream.push('0.08 0.18 0.36 rg'); // #152e5c
  stream.push('40 790 515 4 re f'); // Accent bar
  stream.push('Q');

  // 2. Business Title & Document Title
  stream.push('BT');
  stream.push('/F1 18 Tf');
  stream.push('0.08 0.18 0.36 rg');
  stream.push(`40 765 Td (${escapePdfText(businessName)}) Tj`);
  stream.push('ET');

  stream.push('BT');
  stream.push('/F1 16 Tf');
  stream.push('0.15 0.25 0.45 rg');
  stream.push(`410 765 Td (${isInvoice ? 'TAX INVOICE' : 'QUOTATION'}) Tj`);
  stream.push('ET');

  // 3. Business Info (Left)
  stream.push('BT');
  stream.push('/F2 9 Tf');
  stream.push('0.3 0.35 0.4 rg');
  stream.push(`40 748 Td (${escapePdfText(businessAddress)}) Tj`);
  if (businessGstin) stream.push(`0 -12 Td (${escapePdfText(businessGstin)}) Tj`);
  if (businessPhone || businessEmail) {
    const contactLine = [businessPhone, businessEmail].filter(Boolean).join(' | ');
    stream.push(`0 -12 Td (${escapePdfText(contactLine)}) Tj`);
  }
  stream.push('ET');

  // 4. Document Meta (Right)
  stream.push('BT');
  stream.push('/F2 9 Tf');
  stream.push('0.3 0.35 0.4 rg');
  stream.push(`410 748 Td (${isInvoice ? 'Invoice No:' : 'Quotation No:'} ${escapePdfText(docNumber)}) Tj`);
  stream.push(`0 -12 Td (Date: ${escapePdfText(docDate)}) Tj`);
  if (docDueDate) {
    stream.push(`0 -12 Td (${isInvoice ? 'Due Date:' : 'Valid Until:'} ${escapePdfText(docDueDate)}) Tj`);
  }
  stream.push(`0 -12 Td (Status: ${escapePdfText(doc.status.toUpperCase())}) Tj`);
  stream.push('ET');

  // Divider Line
  stream.push('q');
  stream.push('0.85 0.88 0.92 RG');
  stream.push('0.75 w');
  stream.push('40 695 m 555 695 l S');
  stream.push('Q');

  // 5. Bill To Section Box
  stream.push('q');
  stream.push('0.97 0.98 0.99 rg');
  stream.push('40 625 515 60 re f');
  stream.push('0.88 0.90 0.93 RG');
  stream.push('0.5 w');
  stream.push('40 625 515 60 re S');
  stream.push('Q');

  stream.push('BT');
  stream.push('/F1 9 Tf');
  stream.push('0.2 0.3 0.45 rg');
  stream.push('50 670 Td (BILLED TO:) Tj');
  stream.push('ET');

  stream.push('BT');
  stream.push('/F1 10 Tf');
  stream.push('0.1 0.15 0.2 rg');
  stream.push(`50 655 Td (${escapePdfText(customerCompany ? `${customerCompany} (${customerName})` : customerName)}) Tj`);
  stream.push('ET');

  stream.push('BT');
  stream.push('/F2 8.5 Tf');
  stream.push('0.35 0.4 0.45 rg');
  const custContact = [customerGstin, customerPhone, customerAddress].filter(Boolean).join('  |  ');
  stream.push(`50 640 Td (${escapePdfText(custContact)}) Tj`);
  stream.push('ET');

  // 6. Items Table Header
  const tableTopY = 610;
  stream.push('q');
  stream.push('0.08 0.18 0.36 rg');
  stream.push(`40 ${tableTopY - 20} 515 20 re f`);
  stream.push('Q');

  stream.push('BT');
  stream.push('/F1 8.5 Tf');
  stream.push('1 1 1 rg');
  stream.push(`48 ${tableTopY - 14} Td (#) Tj`);
  stream.push(`24 0 Td (Item Description) Tj`);
  stream.push(`210 0 Td (HSN) Tj`);
  stream.push(`60 0 Td (Qty) Tj`);
  stream.push(`50 0 Td (Rate) Tj`);
  stream.push(`50 0 Td (Tax%) Tj`);
  stream.push(`40 0 Td (Amount) Tj`);
  stream.push('ET');

  // 7. Table Rows
  let currentY = tableTopY - 20;
  const items = doc.items || [];

  items.slice(0, 18).forEach((item, index) => {
    const isDim = item.billingType === 'dimension';
    const rowHeight = isDim ? 26 : 18;
    currentY -= rowHeight;
    const isEven = index % 2 === 1;

    if (isEven) {
      stream.push('q');
      stream.push('0.97 0.98 0.99 rg');
      stream.push(`40 ${currentY} 515 ${rowHeight} re f`);
      stream.push('Q');
    }

    // Row bottom border
    stream.push('q');
    stream.push('0.9 0.92 0.95 RG');
    stream.push('0.5 w');
    stream.push(`40 ${currentY} m 555 ${currentY} l S`);
    stream.push('Q');

    const rateStr = isDim
      ? `Rs. ${item.rate.toFixed(2)}/${item.billingUnit || 'sq.ft'}`
      : `Rs. ${item.rate.toFixed(2)}`;
    const amtStr = `Rs. ${item.amount.toFixed(2)}`;
    const textY = isDim ? currentY + 14 : currentY + 5;

    stream.push('BT');
    stream.push('/F2 8.5 Tf');
    stream.push('0.15 0.2 0.25 rg');
    stream.push(`48 ${textY} Td (${index + 1}) Tj`);
    stream.push(`24 0 Td (${escapePdfText(item.productName.slice(0, 32))}) Tj`);
    stream.push(`210 0 Td (${escapePdfText(item.hsnCode || '—')}) Tj`);
    stream.push(`60 0 Td (${item.quantity}${isDim ? ' pcs' : ''}) Tj`);
    stream.push(`50 0 Td (${escapePdfText(rateStr.slice(0, 16))}) Tj`);
    stream.push(`50 0 Td (${item.taxRate}%) Tj`);
    stream.push(`40 0 Td (${escapePdfText(amtStr)}) Tj`);
    stream.push('ET');

    if (isDim) {
      const dimDesc = `Size: ${item.length || 0} ${item.dimensionUnit || 'ft'} x ${item.width || 0} ${item.dimensionUnit || 'ft'} | Billable Area: ${item.billableQuantity || 0} ${item.billingUnit || 'sq.ft'}`;
      stream.push('BT');
      stream.push('/F2 7 Tf');
      stream.push('0.3 0.45 0.65 rg');
      stream.push(`72 ${currentY + 4} Td (${escapePdfText(dimDesc)}) Tj`);
      stream.push('ET');
    }
  });

  // 8. Financial Summary Block
  const summaryTopY = Math.max(160, currentY - 25);

  // Left: Amount in words & Bank info
  stream.push('BT');
  stream.push('/F1 8.5 Tf');
  stream.push('0.3 0.35 0.4 rg');
  stream.push(`40 ${summaryTopY} Td (AMOUNT IN WORDS:) Tj`);
  stream.push('ET');

  stream.push('BT');
  stream.push('/F2 8.5 Tf');
  stream.push('0.15 0.2 0.25 rg');
  const inWords = numberToWords(doc.grandTotal);
  stream.push(`40 ${summaryTopY - 14} Td (${escapePdfText(inWords)}) Tj`);
  stream.push('ET');

  if (settings.bankName && settings.accountNumber) {
    stream.push('BT');
    stream.push('/F1 8 Tf');
    stream.push('0.3 0.35 0.4 rg');
    stream.push(`40 ${summaryTopY - 34} Td (BANK DETAILS:) Tj`);
    stream.push('/F2 8 Tf');
    stream.push(`0 -10 Td (Bank: ${escapePdfText(settings.bankName)} | A/C: ${escapePdfText(settings.accountNumber)} | IFSC: ${escapePdfText(settings.ifscCode || '')}) Tj`);
    if (settings.upiId) {
      stream.push(`0 -10 Td (UPI ID: ${escapePdfText(settings.upiId)}) Tj`);
    }
    stream.push('ET');
  }

  // Right: Totals Box
  const totalsLeft = 360;
  stream.push('q');
  stream.push('0.97 0.98 0.99 rg');
  stream.push(`${totalsLeft} ${summaryTopY - 70} 195 85 re f`);
  stream.push('0.85 0.88 0.92 RG');
  stream.push('0.5 w');
  stream.push(`${totalsLeft} ${summaryTopY - 70} 195 85 re S`);
  stream.push('Q');

  stream.push('BT');
  stream.push('/F2 8.5 Tf');
  stream.push('0.3 0.35 0.4 rg');
  stream.push(`${totalsLeft + 10} ${summaryTopY} Td (Subtotal:) Tj`);
  stream.push(`110 0 Td (${escapePdfText(formatCurrency(doc.subtotal))}) Tj`);

  if (doc.discountTotal > 0) {
    stream.push(`-110 -13 Td (Discount:) Tj`);
    stream.push(`110 0 Td (-${escapePdfText(formatCurrency(doc.discountTotal))}) Tj`);
  } else {
    stream.push(`-110 -13 Td (Tax Total:) Tj`);
    stream.push(`110 0 Td (${escapePdfText(formatCurrency(doc.taxTotal))}) Tj`);
  }

  stream.push(`-110 -13 Td (CGST / SGST:) Tj`);
  stream.push(`110 0 Td (${escapePdfText(formatCurrency(doc.taxTotal / 2))} x 2) Tj`);

  // Grand Total Highlight
  stream.push('/F1 10.5 Tf');
  stream.push('0.08 0.18 0.36 rg');
  stream.push(`-110 -18 Td (Grand Total:) Tj`);
  stream.push(`110 0 Td (${escapePdfText(formatCurrency(doc.grandTotal))}) Tj`);
  stream.push('ET');

  // 9. Terms & Authorized Signature
  const footerY = 65;
  stream.push('q');
  stream.push('0.85 0.88 0.92 RG');
  stream.push('0.5 w');
  stream.push(`40 ${footerY + 25} m 555 ${footerY + 25} l S`);
  stream.push('Q');

  stream.push('BT');
  stream.push('/F2 7.5 Tf');
  stream.push('0.4 0.45 0.5 rg');
  stream.push(`40 ${footerY + 12} Td (${escapePdfText(settings.footerMessage || 'Subject to local jurisdiction. Goods once sold will not be taken back.')}) Tj`);
  stream.push(`40 ${footerY} Td (This is a computer-generated document and requires no physical signature.) Tj`);
  stream.push('ET');

  stream.push('BT');
  stream.push('/F1 8.5 Tf');
  stream.push('0.2 0.25 0.3 rg');
  stream.push(`420 ${footerY + 12} Td (For ${escapePdfText(businessName)}) Tj`);
  stream.push('/F2 7.5 Tf');
  stream.push(`0 -12 Td (Authorized Signatory) Tj`);
  stream.push('ET');

  // Assemble PDF document objects
  const streamData = stream.join('\n');
  const streamLength = new TextEncoder().encode(streamData).length;

  const objects: string[] = [];

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

  // Object 3: Page
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj'
  );

  // Object 4: Contents Stream
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamData}\nendstream\nendobj`);

  // Object 5: Font Helvetica-Bold
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  // Object 6: Font Helvetica
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  // Build XRef & Trailer
  let offset = '%PDF-1.4\n'.length;
  const xrefOffsets: number[] = [0];

  let body = '%PDF-1.4\n';
  for (const obj of objects) {
    xrefOffsets.push(offset);
    body += obj + '\n';
    offset += new TextEncoder().encode(obj + '\n').length;
  }

  const startXref = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(xrefOffsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  const fullPdfString = body + xref + trailer;

  const binaryBytes = new TextEncoder().encode(fullPdfString);
  const blob = new Blob([binaryBytes], { type: 'application/pdf' });

  // Convert to Base64
  let binaryString = '';
  for (let i = 0; i < binaryBytes.byteLength; i++) {
    binaryString += String.fromCharCode(binaryBytes[i]);
  }
  const base64 = btoa(binaryString);

  return { blob, base64 };
}

/**
 * Triggers standard browser download for generated PDF
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
