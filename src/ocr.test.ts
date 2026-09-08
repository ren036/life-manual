import { describe, expect, it } from 'vitest';
import { cleanOcrText } from './ocr';

describe('OCR 文字整理', () => {
  it('移除行尾空格和多余空行', () => {
    expect(cleanOcrText('发票号码 123  \n\n\n金额 88 元\n')).toBe('发票号码 123\n\n金额 88 元');
  });
});
