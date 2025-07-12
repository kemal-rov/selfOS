import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';

const { date } = parseArgs(process.argv.slice(2));
const ref = db.collection('healthData').doc(date);

type Metric = {
  name: string;
  units?: string;
  data: { qty?: number; [key: string]: any }[];
};

// --- Metric summarizers ---
function avg(data: any[]) {
  return data.reduce((sum, e) => sum + (e.qty || 0), 0) / data.length;
}
function sum(data: any[]) {
  return data.reduce((sum, e) => sum + (e.qty || 0), 0);
}

function safe(val: any, fallback = '?') {
  return val !== undefined && val !== null ? val : fallback;
}

const summarizers: Record<string, (data: any[]) => string> = {
  step_count: (data) => `${Math.round(sum(data))} steps`,
  walking_speed: (data) => {
    const speeds = data.map(d => d.qty).filter(v => typeof v === 'number');
    const filtered = speeds.filter(v => v >= 0.3 && v <= 3.0);
    const avgSpeed = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return filtered.length
      ? `${(avgSpeed(filtered) * 3.6).toFixed(1)} km/h`
      : speeds.length
        ? `⚠️ ${(avgSpeed(speeds) * 3.6).toFixed(1)} km/h (raw)`
        : `⚠️ no valid data`;
  },
  walking_step_length: (data) => `${avg(data).toFixed(1)} cm`,
  flights_climbed: (data) => `${Math.round(sum(data))}`,
  apple_exercise_time: (data) => `${Math.round(sum(data) / 60)} min`,
  apple_stand_time: (data) => `${Math.round(sum(data) / 60)} min`,
  apple_stand_hour: (data) => {
    const hours = new Set(data.map(d => d.date?.slice(0, 13))); // hour precision
    return `${hours.size} active stand hours`;
  },
  walking_running_distance: (data) => `${(sum(data) / 1000).toFixed(2)} km`,
  walking_asymmetry_percentage: (data) => `${avg(data).toFixed(1)}% asymmetry`,
  walking_double_support_percentage: (data) => `${data.length} entries`,
  stair_speed_down: (data) => `${data.length} entries`,
  active_energy: (data) => `${sum(data).toFixed(1)} kcal`,
  basal_energy_burned: (data) => `${sum(data).toFixed(1)} kcal`,
  heart_rate: (data) => {
    const avgValues = data.map(d => d.Avg).filter(v => typeof v === 'number');
    if (!avgValues.length) return '⚠️ 0 bpm (missing?)';
    const bpm = avgValues.reduce((a, b) => a + b, 0) / avgValues.length;
    return `${Math.round(bpm)} bpm`;
  },
  resting_heart_rate: (data) => `${Math.round(avg(data))} bpm`,
  heart_rate_variability: (data) => `${avg(data).toFixed(1)} ms`,
  walking_heart_rate_average: (data) => `${Math.round(avg(data))} bpm (walking)`,
  blood_oxygen_saturation: (data) => `${avg(data).toFixed(1)}%`,
  respiratory_rate: (data) => `${avg(data).toFixed(1)} bpm`,
  headphone_audio_exposure: (data) => `${avg(data).toFixed(1)} dB`,
  environmental_audio_exposure: (data) => `${avg(data).toFixed(1)} dB`,
  time_in_daylight: (data) => `${Math.round(sum(data) / 60)} min`,
  weight_body_mass: (data) => `${avg(data).toFixed(1)} kg`,
  breathing_disturbances: (data) => `${data.length} entries`,
  physical_effort: (data) => `Avg effort: ${avg(data).toFixed(1)}`,
};

function summarizeMetric(metric: Metric): string {
  const { name, units = 'unknown', data } = metric;
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
    return;
  }

  const docData = snapshot.data() || {};
  console.log(`🩺 Health Metrics for ${date}:\n`);

  // === METRICS ===
  const metricSnapshot = await ref.collection('metrics').get();
  const metrics = metricSnapshot.docs.map(doc => ({
    name: doc.id,
    units: doc.data().units || '',
    data: Array.isArray(doc.data().data) ? doc.data().data : [],
  }));

  // Support fallback flat structure (if any) from docData.metrics
  const allMetricNames = new Set([
    ...metrics.map(m => m.name),
    ...Object.keys(docData.metrics || {}),
  ]);
  const knownMetricNames = new Set(metrics.map(m => m.name));

  const fallbackMetrics = Array.from(allMetricNames)
    .filter(name => !knownMetricNames.has(name))
    .map(name => ({
      name,
      data: docData.metrics?.[name] || [],
      units: '',
    }));

  const metricsToLog: Metric[] = [...metrics, ...fallbackMetrics];

  for (const metric of metricsToLog) {
    console.log(summarizeMetric(metric));
  }

  // === ECG ===
  const ecgSnap = await ref.collection('ecg').get();
  const ecgEntries: any[] = [];
  for (const doc of ecgSnap.docs) {
    ecgEntries.push(doc.data());
  }

  if (ecgEntries.length) {
    console.log(`\n🫀 ECG: ${ecgEntries.length} entr${ecgEntries.length === 1 ? 'y' : 'ies'}`);
    for (const entry of ecgEntries) {
      const { averageHeartRate, classification, start, end, samplingFrequency, numberOfVoltageMeasurements } = entry;
      console.log(
      `• ${safe(classification, 'Unknown')} rhythm — ${safe(averageHeartRate)} bpm — ${safe(samplingFrequency)} Hz — ${safe(numberOfVoltageMeasurements)} pts — ${safe(start)} → ${safe(end)}`
    );
    }
  }

  // === WORKOUTS ===
  const workoutsSnap = await ref.collection('workouts').get();
  const workoutDocs = workoutsSnap.docs.map(doc => doc.data());

  let workoutCount = 0;
  let energyTotal = 0;

  for (const workout of workoutDocs) {
    if (Array.isArray(workout.activeEnergy)) {
      workoutCount++;
      energyTotal += workout.activeEnergy.reduce((sum, e) => sum + (e.qty || 0), 0);
    }
  }

  if (workoutCount) {
    console.log(`\n🏃 Workouts: ${workoutCount} session${workoutCount === 1 ? '' : 's'}`);
    console.log(`🔥 Total Active Energy: ${energyTotal.toFixed(1)} kcal`);
  }

  // === RECEIVED AT ===
  const receivedAt = docData.receivedAt?.toDate?.();
  if (receivedAt) {
    console.log(`\n🕒 Received at: ${receivedAt.toLocaleString()}`);
  }
})();