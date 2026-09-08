export function parseIngredients(value: string): string[] {
  return value
    .split(/\r?\n|[，,、]+/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}
