export interface ParsedArgs {
  date: string;         // "2025-07-06"
  input: string;        // "meal or mood or weight description"
}

export function parseArgs(argv: string[]): ParsedArgs {
  const dateArg = argv.find(arg => arg.startsWith('--date='));
  const inputParts = argv.filter(arg => !arg.startsWith('--date='));
  const input = inputParts.join(' ').trim();

  const date = dateArg?.split('=')[1] || getTodayDate();
  return { date, input };
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}