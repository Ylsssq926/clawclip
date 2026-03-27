import { describe, it, expect } from 'vitest';
import { isSessionFile, stripSessionExt } from '../services/agent-data-root.js';

describe('session file extensions', () => {
  it('matches default .jsonl extension', () => {
    expect(isSessionFile('session-abc123.jsonl')).toBe(true);
  });

  it('rejects non-session files', () => {
    expect(isSessionFile('config.json')).toBe(false);
    expect(isSessionFile('README.md')).toBe(false);
    expect(isSessionFile('sessions.json')).toBe(false);
  });

  it('strips .jsonl extension', () => {
    expect(stripSessionExt('session-abc.jsonl')).toBe('session-abc');
  });

  it('preserves name when no matching extension', () => {
    expect(stripSessionExt('sessions.json')).toBe('sessions.json');
  });
});
