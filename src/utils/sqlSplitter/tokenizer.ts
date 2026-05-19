// Pure single-token scanner. Stateless aside from the small `TokenizerState`
// (current delimiter + lineLeading flag) that the splitter owns and mutates.

import type { DialectOptions, QuoteRule, Token } from './index';

export interface TokenizerState {
  delimiter: string;
  lineLeading: boolean;
}

const IDENT_CHAR_RE = /[A-Za-z0-9_]/;

export function scanToken(
  source: string,
  position: number,
  options: DialectOptions,
  state: TokenizerState,
): Token | null {
  if (position >= source.length) return null;

  if (
    state.delimiter.length > 0 &&
    source.startsWith(state.delimiter, position)
  ) {
    return { kind: 'delimiter', length: state.delimiter.length };
  }

  const ch = source[position];

  if (ch === '\n') return { kind: 'eoln', length: 1 };
  if (ch === ' ' || ch === '\t' || ch === '\r') {
    return { kind: 'whitespace', length: 1 };
  }

  if (options.lineComments && ch === '-' && source[position + 1] === '-') {
    let end = position + 2;
    while (end < source.length && source[end] !== '\n') end++;
    return { kind: 'lineComment', length: end - position };
  }

  if (options.blockComments && ch === '/' && source[position + 1] === '*') {
    let end = position + 2;
    while (end + 1 < source.length) {
      if (source[end] === '*' && source[end + 1] === '/') {
        return { kind: 'blockComment', length: end + 2 - position };
      }
      end++;
    }
    return { kind: 'blockComment', length: source.length - position };
  }

  if (
    options.eString &&
    (ch === 'E' || ch === 'e') &&
    source[position + 1] === "'" &&
    !isIdentBoundary(source, position - 1)
  ) {
    return scanEString(source, position);
  }

  if (options.dollarQuoting && ch === '$') {
    const dollarToken = scanDollarQuoted(source, position);
    if (dollarToken) return dollarToken;
  }

  for (const rule of options.quotes) {
    if (source.startsWith(rule.open, position)) {
      return scanQuoted(source, position, rule);
    }
  }

  if (state.lineLeading) {
    if (
      options.customDelimiter &&
      matchesKeyword(source, position, 'DELIMITER')
    ) {
      const token = readCustomDelimiter(source, position);
      if (token) return token;
    }
    if (options.goDelimiter && matchesKeyword(source, position, 'GO')) {
      const token = readGoDelimiter(source, position);
      if (token) return token;
    }
  }

  return { kind: 'data', length: 1 };
}

function isIdentBoundary(source: string, prevIndex: number): boolean {
  if (prevIndex < 0) return false;
  return IDENT_CHAR_RE.test(source[prevIndex]);
}

function scanQuoted(
  source: string,
  position: number,
  rule: QuoteRule,
): Token {
  const start = position;
  let p = position + rule.open.length;
  while (p < source.length) {
    if (
      rule.escape !== undefined &&
      source[p] === rule.escape &&
      p + 1 < source.length
    ) {
      p += 2;
      continue;
    }
    if (source.startsWith(rule.close, p)) {
      if (
        rule.doubleClose &&
        source.startsWith(rule.close, p + rule.close.length)
      ) {
        p += rule.close.length * 2;
        continue;
      }
      return { kind: 'string', length: p + rule.close.length - start };
    }
    p++;
  }
  return { kind: 'string', length: source.length - start };
}

function scanEString(source: string, position: number): Token {
  let p = position + 2;
  while (p < source.length) {
    if (source[p] === '\\' && p + 1 < source.length) {
      p += 2;
      continue;
    }
    if (source[p] === "'") {
      if (source[p + 1] === "'") {
        p += 2;
        continue;
      }
      return { kind: 'string', length: p + 1 - position };
    }
    p++;
  }
  return { kind: 'string', length: source.length - position };
}

const DOLLAR_TAG_RE = /^\$([A-Za-z0-9_]*)\$/;

function scanDollarQuoted(source: string, position: number): Token | null {
  const slice = source.slice(position);
  const match = DOLLAR_TAG_RE.exec(slice);
  if (!match) return null;
  const tag = match[0];
  let p = position + tag.length;
  while (p < source.length) {
    if (source.startsWith(tag, p)) {
      return { kind: 'string', length: p + tag.length - position };
    }
    p++;
  }
  return { kind: 'string', length: source.length - position };
}

function matchesKeyword(
  source: string,
  position: number,
  word: string,
): boolean {
  if (position + word.length > source.length) return false;
  for (let i = 0; i < word.length; i++) {
    const c = source[position + i];
    if (c.toUpperCase() !== word[i]) return false;
  }
  const after = source[position + word.length];
  if (after !== undefined && IDENT_CHAR_RE.test(after)) return false;
  return true;
}

const CUSTOM_DELIM_RE = /^DELIMITER[ \t]+([^\n\r]+)/i;

function readCustomDelimiter(source: string, position: number): Token | null {
  const slice = source.slice(position);
  const m = CUSTOM_DELIM_RE.exec(slice);
  if (!m) return null;
  const value = m[1].trim();
  if (value.length === 0) return null;
  return { kind: 'setDelimiter', length: m[0].length, value };
}

const GO_RE = /^GO[ \t\r]*(\n|$)/i;

function readGoDelimiter(source: string, position: number): Token | null {
  const slice = source.slice(position);
  const m = GO_RE.exec(slice);
  if (!m) return null;
  const length = m[0].endsWith('\n') ? m[0].length - 1 : m[0].length;
  return { kind: 'goDelimiter', length };
}
