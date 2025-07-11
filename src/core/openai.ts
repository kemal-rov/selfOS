import { OpenAI } from 'openai';
import { goals } from './goals';
import { resolveRecipeAlias } from './recipes';
import { getWeightHistory } from './queries';
import { getWeeklyWeightAverages } from './weight'
import { getReflectionTags } from './reflections';
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

  const prompt = `Estimate calories and macronutrients for the following meal:\n\n"${mealText}"\n\nReturn only valid JSON like this:\n{\n  "kcal": number,\n  "protein": number,\n  "carbs": number,\n  "fat": number,\n  "fiber": number (optional),\n  "sugar": number (optional)\n}}`;

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
      ...(parsed.fiber !== undefined ? { fiber: parsed.fiber } : {}),
      ...(parsed.sugar !== undefined ? { sugar: parsed.sugar } : {})
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
  sugar,
  mood,
  weight,
  meals
}: DailySummaryInput): Promise<string> {
  const weightHistory = await getWeightHistory();
  const weeklyAverages = getWeeklyWeightAverages(weightHistory);
  const tags = getReflectionTags({
  kcal,
  protein,
  meals,
  mood
});

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const prompt = `You're a smart and observant sports & nutrition assistant. Reflect on the user's daily health journey based on the data and long-term goals.

  Use the mood as insight into their motivation or fatigue.
  Refer to patterns from the meals, weight trend, and macros — not just each in isolation.
  Avoid vague praise or generic advice. Be concrete and personalized. Avoid repeating advice from previous days.

  Limit your response to exactly 2-3 short sentences. Be concise, precise, and practical.

  User Goals:
  - Goal weight: ${goals.goalWeight} kg
  - Stay under ${goals.kcalLimit} kcal
  ${goals.strengthFocus ? '- Improve strength and muscle definition\n' : ''}
  ${goals.highProtein ? '- Prioritize high protein intake\n' : ''}
  ${goals.avoidSugar ? '- Minimize added sugar\n' : ''}
  ${goals.limitJunkFood ? '- Limit empty-calorie snacks and highly processed fast foods\n' : ''}
  ${goals.avoidSugar ? '- Minimize added sugar intake\n' : ''}

  Daily Summary:
  - kcal: ${kcal}, protein: ${protein}, carbs: ${carbs}, fat: ${fat}, ${fiber !== undefined ? `, sugar: ${sugar}` : ''}, ${sugar !== undefined ? `, sugar: ${sugar}` : ''}
  ${meals?.length ? `- Meals: ${meals.map(m => `${m.name}${m.name === 'dark matter brownie' ? ' (homemade protein-rich healthy dessert)' : ''}`).join(', ')}` : ''}
  ${weight ? `- Weight: ${weight} kg` : ''}
  ${weeklyAverages?.length ? `- Weekly weight averages: ${weeklyAverages.join(', ')} kg` : ''}
  ${mood ? `- Mood: ${mood}` : ''}
  ${tags.length ? `Heuristic Tags (for context): ${tags.join(', ')}` : ''}

  Generated at: ${currentTime} - reflect based on time of day as well.
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

  const prompt = `You're a smart and observant sports & nutrition assistant reviewing the user's weight progress over time.

  Here is their historical weight log:
  ${formatted}

  Write a short, focused reflection (2-3 sentences) based on this data.

  🎯 Focus on:
  - Trends across time: e.g., steady decrease, stalls, or fluctuations
  - Do take entire dataset in consideration, but also
    put extra weight on the **last 4 weeks' data**
  - Be encouraging but realistic — highlight consistency, effort, or setbacks in a constructive way

  ${goals.goalWeight ? `The user's goal weight is ${goals.goalWeight} kg.\n` : ''}
  ${goals.strengthFocus ? `They are also focused on building or maintaining strength.\n` : ''}

  Avoid repeating exact numbers. Offer clear insight or motivation based on the trend.`;
  
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0].message.content?.trim() || '';
}

export async function getWeeklyReflectionSummary({
  reflections,
  dailyKcal,
  weeklyWeightAverages
}: {
  reflections: { date: string; reflection: string }[];
  dailyKcal?: Record<string, number>;
  weeklyWeightAverages?: number[];
}): Promise<string> {
  const formattedReflections = reflections
    .map(r => `📅 ${r.date}: ${r.reflection}`)
    .join('\n\n');

  const formattedKcal =
    dailyKcal && Object.keys(dailyKcal).length
      ? Object.entries(dailyKcal)
          .map(([date, kcal]) => `📅 ${date}: ${kcal} kcal`)
          .join('\n')
      : null;

  const formattedWeights =
    weeklyWeightAverages && weeklyWeightAverages.length
      ? weeklyWeightAverages.join(', ') + ' kg'
      : null;

  const prompt = `You're a smart and observant sports & nutrition assistant. Write a concise weekly reflection (about 4 sentences) based on the user's last 7 days.

  Use the following inputs:
  - Daily GPT-generated reflections (based on food, macros, weight, and goals)
  - The user's mood logs (journal-style)
  - Any recurring trends, motivational shifts, or struggles

  Incorporate calorie intake and weight averages if relevant, but focus on insight over numbers. Look for consistency, intent, setbacks, or emotional cues.

  Avoid vague praise — be specific, helpful, and gently constructive. Mention key insights without repeating previous advice.

  ${formattedKcal ? `\n📊 Daily Calories:\n${formattedKcal}` : ''}
  ${formattedWeights ? `\n⚖️ Weekly Weight Averages: ${formattedWeights}` : ''}

  🧠 Daily Reflections:
  ${formattedReflections}

  Reply only with the weekly summary — no intro, no title, no extra formatting.`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0].message.content?.trim() || '';
}