import { describe, expect, it } from 'vitest';
import { parseIngredients } from './ingredients';

describe('菜谱食材输入', () => {
  it('保留食材中的用量和空格', () => {
    expect(parseIngredients('鸡胸肉 500 克\n黑胡椒 1 小勺')).toEqual([
      '鸡胸肉 500 克',
      '黑胡椒 1 小勺',
    ]);
  });

  it('兼容原有的逗号输入方式', () => {
    expect(parseIngredients('鸡蛋 2 个，番茄 300 克')).toEqual(['鸡蛋 2 个', '番茄 300 克']);
  });
});
