export class PdfService {
  public static validateBase64Pdf(base64: string): boolean {
    if (!base64 || typeof base64 !== 'string') return false;
    try {
      const sample = Buffer.from(base64.slice(0, 32), 'base64').toString('ascii');
      return sample.startsWith('%PDF-');
    } catch {
      return false;
    }
  }
}
