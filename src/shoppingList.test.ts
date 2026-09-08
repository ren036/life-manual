import { describe, expect, it } from 'vitest';
import { buildShoppingList, shoppingAmountLabel, shoppingListText } from './shoppingList';
import type { Recipe } from './types';

function recipe(title: string, ingredients: string[]): Recipe {
  return {
    id: title,
    title,
    ingredients,
    notes: '',
    category: '家常菜',
    date: '',
    createdAt: 1,
  };
}

describe('采购清单', () => {
  it('合并不同菜谱中的相同食材和同单位用量', () => {
    const items = buildShoppingList([
      recipe('番茄炒蛋', ['鸡蛋 2 个', '番茄 300 克']),
      recipe('青椒炒蛋', ['鸡蛋 3个', '青椒']),
    ]);

    const eggs = items.find((item) => item.name === '鸡蛋');
    expect(eggs).toEqual({
      name: '鸡蛋',
      amounts: ['2 个', '3个'],
      unspecifiedCount: 0,
      recipes: ['番茄炒蛋', '青椒炒蛋'],
    });
    expect(shoppingAmountLabel(eggs!)).toBe('5 个');
  });

  it('提示没有填写用量的食材', () => {
    const [item] = buildShoppingList([recipe('炒青菜', ['青菜'])]);
    expect(shoppingAmountLabel(item)).toBe('按需购买');
    expect(shoppingListText([recipe('炒青菜', ['青菜'])], [item])).toContain(
      '- 青菜：按需购买（炒青菜）',
    );
  });
});
