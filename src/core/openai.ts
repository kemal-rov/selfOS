import { OpenAI } from 'openai';
import { goals } from './goals';
import { Macros, DailySummaryInput } from './types';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function getMealMacrosFromGPT(mealText: string): Promise<Macros> {
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
  weight
}: DailySummaryInput): Promise<string> {
  const prompt = `Here is a daily nutrition and mood log. Based on the data and user goals, write a short, supportive suggestion. Keep it plain, friendly, and limited to 2–3 sentences. Don't repeat the numbers. Mention how well the user stuck to their goals or where they can gently improve.

User goals:
- Stay under ${goals.kcalLimit} kcal
${goals.highProtein ? '- Prioritize high protein intake\n' : ''}
${goals.avoidSugar ? '- Minimize added sugar\n' : ''}
${goals.avoidProcessed ? '- Avoid overly processed food\n' : ''}

Daily summary:
- kcal: ${kcal}
- protein: ${protein}
- carbs: ${carbs}
- fat: ${fat}
${fiber !== undefined ? `- fiber: ${fiber}` : ''}
${mood ? `- mood: ${mood}` : ''}
${weight ? `- weight: ${weight} kg` : ''}

Reply only with the short reflection, no intro or formatting.`;

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

Write a short reflection (2–3 sentences) based on this data. Mention any trends (e.g., consistency, increases, drops), give gentle encouragement, and keep it friendly.`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0].message.content?.trim() || '';
}