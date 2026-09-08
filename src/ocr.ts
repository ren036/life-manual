export interface OcrProgress {
  status: string;
  progress: number;
}

export function cleanOcrText(value: string): string {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function recognizeDocument(
  image: File | Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  const { createWorker, OEM } = await import('tesseract.js');
  const worker = await createWorker('chi_sim', OEM.LSTM_ONLY, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/core',
    langPath: '/ocr/lang',
    logger: (message) =>
      onProgress?.({
        status: message.status,
        progress: typeof message.progress === 'number' ? message.progress : 0,
      }),
  });
  try {
    const result = await worker.recognize(image);
    return cleanOcrText(result.data.text);
  } finally {
    await worker.terminate();
  }
}
