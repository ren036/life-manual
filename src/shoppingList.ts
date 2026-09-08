import type { Recipe } from './types';

export interface ShoppingListItem {
  name: string;
  amounts: string[];
  unspecifiedCount: number;
  recipes: string[];
}

const AMOUNT_PATTERN =
  /^(.*?)(\s*(?:(?:\d+(?:\.\d+)?|半)\s*(?:千克|公斤|毫升|小勺|大勺|茶匙|汤匙|克|斤|两|升|个|只|颗|枚|根|棵|把|片|块|包|袋|盒|瓶|罐|勺|杯)(?:\s.*)?|适量|少许))$/;

function splitIngredient(ingredient: string): { name: string; amount?: string } {
  const normalized = ingredient.trim().replace(/\s+/g, ' ');
  const match = normalized.match(AMOUNT_PATTERN);
  if (!match?.[1].trim()) return { name: normalized };
  return { name: match[1].trim(), amount: match[2].trim() };
}

export function buildShoppingList(recipes: Recipe[]): ShoppingListItem[] {
  const grouped = new Map<string, ShoppingListItem>();

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const { name, amount } = splitIngredient(ingredient);
      if (!name) return;
      const key = name.toLocaleLowerCase('zh-CN');
      const item = grouped.get(key) || {
        name,
        amounts: [],
        unspecifiedCount: 0,
        recipes: [],
      };
      if (amount) item.amounts.push(amount);
      else item.unspecifiedCount += 1;
      if (!item.recipes.includes(recipe.title)) item.recipes.push(recipe.title);
      grouped.set(key, item);
    });
  });

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export function shoppingAmountLabel(item: ShoppingListItem): string {
  if (!item.amounts.length) return '按需购买';
  const parsed = item.amounts.map((amount) => amount.match(/^(\d+(?:\.\d+)?)\s*(.+)$/));
  const sameUnit = parsed.every((match) => match && match[2] === parsed[0]?.[2]);
  const amounts = sameUnit
    ? `${parsed.reduce((total, match) => total + Number(match?.[1]), 0)} ${parsed[0]?.[2]}`
    : item.amounts.join(' + ');
  return item.unspecifiedCount ? `${amounts}，另有 ${item.unspecifiedCount} 道菜未标用量` : amounts;
}

export function shoppingListText(recipes: Recipe[], items = buildShoppingList(recipes)): string {
  const recipeNames = recipes.map((recipe) => recipe.title).join('、');
  return [
    `采购清单（${recipeNames}）`,
    ...items.map(
      (item) => `- ${item.name}：${shoppingAmountLabel(item)}（${item.recipes.join('、')}）`,
    ),
  ].join('\n');
}
