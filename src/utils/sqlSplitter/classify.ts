// Single-statement classifiers. Mirror of
// src-tauri/src/drivers/common/query.rs:7-84 but word-boundary aware so
// `SELECTIVE` does not match `SELECT`.

const RESULT_SET_KEYWORDS: ReadonlySet<string> = new Set([
  'SELECT',
  'WITH',
  'SHOW',
  'EXPLAIN',
  'DESCRIBE',
  'DESC',
  'VALUES',
  'TABLE',
  'PRAGMA',
  'CALL',
]);

const EXPLAINABLE_KEYWORDS: ReadonlySet<string> = new Set([
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'REPLACE',
  'WITH',
  'TABLE',
]);

export function stripLeadingComments(query: string): string {
  let s = query;
  for (;;) {
    s = s.replace(/^\s+/, '');
    if (s.startsWith('--')) {
      const nl = s.indexOf('\n');
      s = nl === -1 ? '' : s.slice(nl + 1);
    } else if (s.startsWith('/*')) {
      const end = s.indexOf('*/');
      s = end === -1 ? '' : s.slice(end + 2);
    } else {
      break;
    }
  }
  return s;
}

const LEADING_KEYWORD_RE = /^([A-Za-z_][A-Za-z0-9_]*)/;

function leadingKeyword(query: string): string {
  const stripped = stripLeadingComments(query);
  const match = LEADING_KEYWORD_RE.exec(stripped);
  return match ? match[1].toUpperCase() : '';
}

export function isSelect(query: string): boolean {
  return leadingKeyword(query) === 'SELECT';
}

export function returnsResultSet(query: string): boolean {
  return RESULT_SET_KEYWORDS.has(leadingKeyword(query));
}

export function isExplainable(query: string): boolean {
  return EXPLAINABLE_KEYWORDS.has(leadingKeyword(query));
}
