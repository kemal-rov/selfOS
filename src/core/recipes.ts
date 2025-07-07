import { Macros } from './types';

export const recipes: Record<string, Macros> = {
  'dark matter brownie': {
    kcal: 92,
    protein: 7.4,
    fat: 5.9,
    carbs: 4.9,
    fiber: 2
  },
  'yogurt combo': {
    kcal: 345,
    protein: 25,
    carbs: 42,
    fat: 9,
    fiber: 5
  }
};

export function resolveRecipeAlias(input: string): Macros | null {
  const normalized = input.trim().toLowerCase();

  // ✅ First check: direct alias (e.g. "dark matter brownie")
  if (recipes[normalized]) return recipes[normalized];

  // ✅ Second check: multiplier form (e.g. "2x dark matter brownie")
  const match = normalized.match(/^(\d+(?:\.\d+)?)x\s(.+)$/);
  if (!match) return null;

  const multiplier = parseFloat(match[1]);
  const recipeName = match[2].trim();

  const base = recipes[recipeName];
  if (!base) return null;

  return {
    kcal: Math.round(base.kcal * multiplier),
    protein: Math.round(base.protein * multiplier),
    carbs: Math.round(base.carbs * multiplier),
    fat: Math.round(base.fat * multiplier),
    fiber: base.fiber ? Math.round(base.fiber * multiplier) : 0
  };
}