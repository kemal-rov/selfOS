import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';

const { date } = parseArgs(process.argv.slice(2));
const ref = db.collection('healthData').doc(date);

// --- Metric Summarizers ---
type Metric = {
  name: string;
  units?: string;
  data: { qty: number }[];
};

function avg(data: any[]) {
  return data.reduce((sum, e) => sum + (e.qty || 0), 0) / data.length;
}

function sum(data: any[]) {
  return data.reduce((sum, e) => sum + (e.qty || 0), 0);
}

const summarizers: Record<string, (data: any[]) => string> = {
  active_energy: (data) => `${(sum(data) / 4.184).toFixed(1)} kcal`,
  basal_energy_burned: (data) => `${(sum(data) / 4.184).toFixed(1)} kcal`,
  step_count: (data) => `${Math.round(sum(data))} steps`,
  flights_climbed: (data) => `${Math.round(sum(data))}`,
  walking_speed: (data) => {
    const speeds = data.map(d => d.qty).filter(v => typeof v === 'number');
    const filtered = speeds.filter(v => v >= 0.5 && v <= 2.2);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return filtered.length
      ? `${(avg(filtered) * 3.6).toFixed(1)} km/h`
      : `⚠️ ${(avg(speeds) * 3.6).toFixed(1)} km/h (raw)`;
  },
  walking_step_length: (data) => `${avg(data).toFixed(1)} cm`,
  headphone_audio_exposure: (data) => `${avg(data).toFixed(1)} dB`,
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

  if (Array.isArray(metrics)) {
    const allMetricNames = [...new Set(metrics.map(m => m.name))];
    console.log('📦 Available metric names:', allMetricNames);
  }
})();