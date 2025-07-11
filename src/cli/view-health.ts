import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';

const { date } = parseArgs(process.argv.slice(2));
const ref = db.collection('healthData').doc(date);

// --- Metric Summarizers ---
type Metric = {
  name: string;
  units?: string;
  data: { qty?: number; [key: string]: any }[];
};

function avg(data: any[]) {
  return data.reduce((sum, e) => sum + (e.qty || 0), 0) / data.length;
}

function sum(data: any[]) {
  return data.reduce((sum, e) => sum + (e.qty || 0), 0);
}

const summarizers: Record<string, (data: any[]) => string> = {
  // 1. Activity & Movement
  step_count: (data) => `${Math.round(sum(data))} steps`,
  walking_speed: (data) => {
    const speeds = data.map(d => d.qty).filter(v => typeof v === 'number');
    const filtered = speeds.filter(v => v >= 0.5 && v <= 2.2);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return filtered.length
      ? `${(avg(filtered) * 3.6).toFixed(1)} km/h`
      : `⚠️ ${(avg(speeds) * 3.6).toFixed(1)} km/h (raw)`;
  },
  walking_step_length: (data) => `${avg(data).toFixed(1)} cm`,
  flights_climbed: (data) => `${Math.round(sum(data))}`,
  apple_exercise_time: (data) => `${Math.round(sum(data) / 60)} min`,
  apple_stand_time: (data) => `${Math.round(sum(data) / 60)} min`,
  apple_stand_hour: (data) => `${data.length} active stand hours`,
  walking_running_distance: (data) => `${(sum(data) / 1000).toFixed(2)} km`,
  walking_asymmetry_percentage: (data) => `${avg(data).toFixed(1)}% asymmetry`,
  walking_double_support_percentage: (data) => `${data.length} entries`,
  stair_speed_down: (data) => `${data.length} entries`,

  // 2. Energy Burn
  active_energy: (data) => `${(sum(data) / 4.184).toFixed(1)} kcal`,
  basal_energy_burned: (data) => `${(sum(data) / 4.184).toFixed(1)} kcal`,

  // 3. Heart & Vitals
  heart_rate: (data) => {
    const avgValues = data.map(d => d.Avg).filter(v => typeof v === 'number');
    if (!avgValues.length) return '⚠️ 0 bpm (missing?)';
    const bpm = avgValues.reduce((a, b) => a + b, 0) / avgValues.length;
    return `${Math.round(bpm)} bpm`;
  },
  resting_heart_rate: (data) => `${Math.round(avg(data))} bpm`,
  heart_rate_variability: (data) => `${avg(data).toFixed(1)} ms`,
  walking_heart_rate_average: (data) => `${Math.round(avg(data))} bpm (walking)`,

  // 4. Respiration & Oxygen
  blood_oxygen_saturation: (data) => `${avg(data).toFixed(1)}%`,
  respiratory_rate: (data) => `${avg(data).toFixed(1)} bpm`,

  // 5. Environmental
  headphone_audio_exposure: (data) => `${avg(data).toFixed(1)} dB`,
  environmental_audio_exposure: (data) => `${avg(data).toFixed(1)} dB`,
  time_in_daylight: (data) => `${Math.round(sum(data) / 60)} min`,

  // 6. Body Metrics
  weight_body_mass: (data) => `${avg(data).toFixed(1)} kg`,

  // 7. Fallbacks / Misc
  breathing_disturbances: (data) => `${data.length} entries`,
  physical_effort: (data) => `Avg effort: ${avg(data).toFixed(1)}`,
};

// --- Formatter ---
function summarizeMetric(metric: Metric): string {
  const { name, units = 'unknown', data } = metric;
  if (!Array.isArray(data) || data.length === 0) {
    return `• ${name} (${units}): no data`;
  }

  const toTitleCase = (str: string) =>
    str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1));

  const prettyName = toTitleCase(name);
  const summarize = summarizers[name] || (() => `${data.length} entries`);
  return `• ${prettyName}: ${summarize(data)}`;
}

// --- Main ---
(async () => {
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    console.log(`❌ No health data found for ${date}`);
    process.exit(0);
  }

  const docData = snapshot.data() || {};
  console.log(`🩺 Health Metrics for ${date}:\n`);

  const metrics = docData.data?.metrics;
  if (Array.isArray(metrics)) {
    for (const metric of metrics) {
      console.log(summarizeMetric(metric));
    }
  } else {
    console.log(`⚠️ No recognizable "metrics" array in data.`);
  }

  const receivedAt = docData.receivedAt?.toDate?.();
  if (receivedAt) {
    console.log(`\n🕒 Received at: ${receivedAt.toLocaleString()}`);
  }
})();