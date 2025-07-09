import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';

const { date } = parseArgs(process.argv.slice(2));
const ref = db.collection('healthData').doc(date);

// --- Summary helpers ---
function summarizeActiveEnergy(data: any[]): string {
  const totalKJ = data.reduce((sum, entry) => sum + (entry.qty || 0), 0);
  const kcal = totalKJ / 4.184;
  return `${kcal.toFixed(1)} kcal`;
}

function summarizeStepCount(data: any[]): string {
  const totalSteps = data.reduce((sum, entry) => sum + (entry.qty || 0), 0);
  return `${Math.round(totalSteps)} steps`;
}

function summarizeAudioExposure(data: any[]): string {
  if (!data.length) return '0 dB';
  const avg = data.reduce((sum, entry) => sum + (entry.qty || 0), 0) / data.length;
  return `${avg.toFixed(1)} dB`;
}

function summarizeGeneric(data: any[]): string {
  return `${data.length} entries`;
}

function summarizeHealthMetric(metric: any): string {
  const { name, data } = metric;

  switch (name) {
    case 'active_energy':
      return `• Active Energy: ${summarizeActiveEnergy(data)}`;
    case 'headphone_audio_exposure':
      return `• Headphone Audio Exposure: ${summarizeAudioExposure(data)}`;
    case 'step_count':
      return `• Step Count: ${summarizeStepCount(data)}`;
    default:
      return `• ${name}: ${summarizeGeneric(data)}`;
  }
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
      console.log(summarizeHealthMetric(metric));
    }
  } else {
    console.log(`⚠️ No recognizable "metrics" array in data.`);
  }

  if (docData.receivedAt?.toDate?.()) {
    console.log(`\n🕒 Received at: ${docData.receivedAt.toDate().toLocaleString()}`);
  }
})();