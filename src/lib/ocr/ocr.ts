// Mock OCR service — replace with real provider (Google Cloud Vision, AWS Textract, etc.)
// Confidence threshold enforced by the caller — AI never auto-verifies regardless of score

export type OcrResult = {
  rawText: string;
  confidence: number; // 0.0 – 1.0
  extracted: Record<string, string | number | null>;
};

export async function runOcr(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  // Simulate OCR processing delay
  await new Promise((r) => setTimeout(r, 300));

  // In production: call Vision API / Textract here and return real results
  // For now: return mock data with realistic confidence distribution
  const confidence = 0.75 + Math.random() * 0.24; // 0.75–0.99

  return {
    rawText: "[OCR simulation — connect a real provider in production]",
    confidence: parseFloat(confidence.toFixed(3)),
    extracted: {
      amount: null,
      transactionRef: null,
      bankName: null,
      dateTime: null,
    },
  };
}
