
export interface ParsedArgs {
  date: string;
  input: string;
  flags: Map<string, string>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const dateArg = argv.find(arg => arg.startsWith('--date='));
  const inlineDate = argv.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  const date = dateArg?.split('=')[1] || inlineDate || getTodayDate();

  const flags = new Map<string, string>();
  for (const arg of argv) {
    if (arg.startsWith('--') && !arg.startsWith('--date=')) {
      const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
      flags.set(key, value);
    }
  }

  const inputParts = argv.filter(arg =>
    !arg.startsWith('--') &&
    !/^\d{4}-\d{2}-\d{2}$/.test(arg) // exclude date from input
  );
  const input = inputParts.join(' ').trim();

  return { date, input, flags };
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}