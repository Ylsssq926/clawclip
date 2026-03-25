const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;
type Level = keyof typeof LEVELS;

const threshold = LEVELS[LOG_LEVEL as Level] ?? LEVELS.info;

function stamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export const log = {
  debug(...args: unknown[]) {
    if (threshold <= LEVELS.debug) console.debug(`[${stamp()}] DEBUG`, ...args);
  },
  info(...args: unknown[]) {
    if (threshold <= LEVELS.info) console.log(`[${stamp()}] INFO`, ...args);
  },
  warn(...args: unknown[]) {
    if (threshold <= LEVELS.warn) console.warn(`[${stamp()}] WARN`, ...args);
  },
  error(...args: unknown[]) {
    if (threshold <= LEVELS.error) console.error(`[${stamp()}] ERROR`, ...args);
  },
};
