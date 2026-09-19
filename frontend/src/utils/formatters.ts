export function formatCurrency(amount: number | undefined | null, includeDecimals = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

export function formatIndianNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateLong(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Convert amount to Indian currency words
export function numberToWords(amount: number): string {
  const wholePart = Math.floor(Math.abs(amount));
  if (wholePart === 0) return 'Rupees Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n: number): string {
    let s = '';
    if (n >= 100) {
      s += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      s += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      s += units[n] + ' ';
    }
    return s.trim();
  }

  let words = '';
  let n = wholePart;

  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const remaining = n;

  if (crores > 0) {
    words += convertLessThanThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    words += convertLessThanThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    words += convertLessThanThousand(thousands) + ' Thousand ';
  }
  if (remaining > 0) {
    words += convertLessThanThousand(remaining) + ' ';
  }

  return `Rupees ${words.trim()} Only`;
}

// Convert byte size to human readable string (e.g. 12 KB, 1.4 MB)
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(Math.max(i, 0), units.length - 1);
  const size = bytes / Math.pow(1024, unitIndex);
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

