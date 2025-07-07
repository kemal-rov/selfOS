export interface Meal {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface DailySummaryInput extends Macros {
  mood?: string;
  weight?: number;
  weeklyAverages?: number[];
  meals?: Meal[];
}