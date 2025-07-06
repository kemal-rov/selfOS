import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export async function getMealMacrosFromGPT(mealText: string): Promise<Macros> {
  const prompt = `Estimate calories and macronutrients for the following meal:\n\n"${mealText}"\n\nReturn only valid JSON like this:\n{\n  "kcal": number,\n  "protein": number,\n  "carbs": number,\n  "fat": number,\n  "fiber": number (optional)\n}`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  });

  let raw = res.choices[0].message.content ?? '{}';

  // Strip markdown fences like ``` json or ```
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
  mood,
  weight
}: {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  mood?: string;
  weight?: number;
}): Promise<string> {
  const prompt = `Based on the following data, write a short, personalized suggestion or reflection. Keep it practical, supportive, and very easy to read — as if you're talking to a friend. Use plain language, avoid fancy terms or abstract phrases, and limit it to 2-3 sentences. Don't repeat the numbers. Just share a useful tip, friendly insight, or quick motivation.

Daily summary:
- kcal: ${kcal}
- protein: ${protein}
- carbs: ${carbs}
- fat: ${fat}
${mood ? `- mood: ${mood}` : ''}
${weight ? `- weight: ${weight} kg` : ''}

Reply only with the suggestion. No intro, no formatting.`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0].message.content?.trim() || '';
}