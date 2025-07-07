import { OpenAI } from 'openai';
import { goals } from './goals';
import { resolveRecipeAlias } from './recipes';
import { getWeightHistory } from './queries';
import { getWeeklyWeightAverages } from './weight';
import { Macros, DailySummaryInput, Meal } from './types';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function getMealMacrosFromGPT(mealText: string): Promise<Macros> {
  const local = resolveRecipeAlias(mealText);

  if (local) {
    console.log(`✅ Resolved alias for "${mealText}"`);
    return local;
  }

  const prompt = `Estimate calories and macronutrients for the following meal:\n\n"${mealText}"\n\nReturn only valid JSON like this:\n{\n  "kcal": number,\n  "protein": number,\n  "carbs": number,\n  "fat": number,\n  "fiber": number (optional)\n}`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  });

  let raw = res.choices[0].message.content ?? '{}';
  raw = raw.trim().replace(/^```(?:json)?/, '').replace(/```$/, '');

  try {
    const parsed = JSON.parse(raw);
    return {
      kcal: Math.round(parsed.kcal),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fat: Math.round(parsed.fat),
      ...(parsed.fiber !== undefined ? { fiber: parsed.fiber } : {})
    };
  } catch (e) {
    console.error(`❌ GPT response parse error:`, raw);
    throw new Error('Failed to parse GPT response for macros.');
  }
}

export async function getDailySuggestion({
  kcal,
  protein,
  carbs,
  fat,
  fiber,
  mood,
  weight,
  meals
}: DailySummaryInput): Promise<string> {
  const weightHistory = await getWeightHistory();
  const weeklyAverages = getWeeklyWeightAverages(weightHistory);
  const mealList = meals?.map((m, i) => `${i + 1}. ${m.name}`).join('\n');

  const prompt = `You're a supportive wellness assistant. Reflect on the user's daily health journey based on the data below and their long-term goals.

  Don't repeat exact numbers. The mood is the user's journal entry — use it for emotional understanding, not summarization.

  Keep the response warm, concise (2-3 sentences), and gently encouraging. Mention strengths, small wins, or areas for improvement.

  User Goals:
  - Stay under ${goals.kcalLimit} kcal
  ${goals.goalWeight ? `- Goal weight: ${goals.goalWeight} kg\n` : ''}
  ${goals.strengthFocus ? '- Build or maintain strength (fitness is a focus)\n' : ''}
  ${goals.highProtein ? '- Prioritize high protein intake\n' : ''}
  ${goals.avoidSugar ? '- Avoid added sugar\n' : ''}
  ${goals.avoidProcessed ? '- Minimize processed foods\n' : ''}

  Daily Summary:
  
  ${mealList ? `- meals today:\n${mealList}` : ''}

  - kcal: ${kcal}, protein: ${protein}, carbs: ${carbs}, fat: ${fat}${fiber !== undefined ? `, fiber: ${fiber}` : ''}
  ${weight ? `- weight: ${weight} kg` : ''}
  ${weeklyAverages?.length ? `- recent weekly weight averages (most recent first): ${weeklyAverages.join(', ')} kg` : ''}
  ${mood ? `- Mood journal: ${mood}` : ''}
  `;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0].message.content?.trim() || '';
}

export async function getWeightReflection(entries: { date: string; weight: number }[]): Promise<string> {
  const formatted = entries.map(e => `${e.date}: ${e.weight} kg`).join('\n');

  const prompt = `Here is the user's recent weight log:

  ${formatted}

  Write a short reflection (2-3 sentences) based on this data. Mention any trends (e.g., consistency, increases, drops), give gentle encouragement, and keep it friendly.`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0].message.content?.trim() || '';
}