import { Macros } from './types';

export const recipes: Record<string, Macros> = {
  'dark matter brownie': {
    kcal: 92,
    protein: 7.4,
    fat: 5.9,
    carbs: 4.9,
    fiber: 2,
    sugar: 0.6
  },
  'yogurt combo': {
    kcal: 430,
    protein: 26,
    carbs: 35.8,
    fat: 18.7,
    fiber: 7.5,
    sugar: 20
  },
  'lahmacun combo': {
    kcal: 660,
    protein: 64,
    carbs: 38,
    fat: 26,
    fiber: 3
  },
  'zalm brood combo': {
    kcal: 465,
    protein: 40,
    carbs: 11.5,
    fat: 30,
    fiber: 2,
    sugar: 2
  },
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
    fiber: base.fiber ? Math.round(base.fiber * multiplier) : 0,
    sugar: base.sugar ? Math.round(base.sugar * multiplier) : 0
  };
}