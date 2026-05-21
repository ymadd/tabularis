// First-party SQL statement splitter. Replaces dbgate-query-splitter.
// Closes #223: comment-only fragments are folded into adjacent statements,
// never emitted as standalone entries.

import { splitInto } from './splitter';

export type Dialect =
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'sqlite'
  | 'oracle'
  | 'generic';

/**
 * Byte-offset span of the meaningful (non-comment) portion of a statement
 * in the original source. Comments folded into `Statement.text` are NOT
 * included in the range — only the actual SQL body. Use this for Monaco
 * decorations / cursor positioning that should target the real statement
 * and skip over surrounding comment whitespace.
 */
export interface StatementRange {
  readonly start: number;
  readonly end: number;
}

export interface Statement {
  readonly text: string;
  readonly range: StatementRange;
  readonly isSelect: boolean;
  readonly returnsResultSet: boolean;
  readonly isExplainable: boolean;
}

export type TokenKind =
  | 'whitespace'
  | 'eoln'
  | 'lineComment'
  | 'blockComment'
  | 'string'
  | 'delimiter'
  | 'setDelimiter'
  | 'goDelimiter'
  | 'data';

export interface Token {
  readonly kind: TokenKind;
  readonly length: number;
  readonly value?: string;
}

export interface QuoteRule {
  readonly open: string;
  readonly close: string;
  readonly escape?: string;
  readonly doubleClose: boolean;
}

export interface DialectOptions {
  readonly quotes: ReadonlyArray<QuoteRule>;
  readonly eString: boolean;
  readonly dollarQuoting: boolean;
  readonly customDelimiter: boolean;
  readonly goDelimiter: boolean;
  readonly lineComments: boolean;
  readonly blockComments: boolean;
}

const STANDARD_QUOTES: ReadonlyArray<QuoteRule> = [
  { open: "'", close: "'", doubleClose: true },
  { open: '"', close: '"', doubleClose: true },
];

const POSTGRES: DialectOptions = {
  quotes: STANDARD_QUOTES,
  eString: true,
  dollarQuoting: true,
  customDelimiter: false,
  goDelimiter: false,
  lineComments: true,
  blockComments: true,
};

const MYSQL: DialectOptions = {
  quotes: [
    { open: "'", close: "'", escape: '\\', doubleClose: true },
    { open: '"', close: '"', escape: '\\', doubleClose: true },
    { open: '`', close: '`', doubleClose: true },
  ],
  eString: false,
  dollarQuoting: false,
  customDelimiter: true,
  goDelimiter: false,
  lineComments: true,
  blockComments: true,
};

const MSSQL: DialectOptions = {
  quotes: [
    { open: "'", close: "'", doubleClose: true },
    // T-SQL: `]]` inside `[...]` is the literal `]` escape.
    { open: '[', close: ']', doubleClose: true },
  ],
  eString: false,
  dollarQuoting: false,
  customDelimiter: false,
  goDelimiter: true,
  lineComments: true,
  blockComments: true,
};

const SQLITE: DialectOptions = {
  quotes: [
    { open: "'", close: "'", doubleClose: true },
    { open: '"', close: '"', doubleClose: true },
    { open: '`', close: '`', doubleClose: true },
    { open: '[', close: ']', doubleClose: false },
  ],
  eString: false,
  dollarQuoting: false,
  customDelimiter: false,
  goDelimiter: false,
  lineComments: true,
  blockComments: true,
};

const ORACLE: DialectOptions = {
  quotes: STANDARD_QUOTES,
  eString: false,
  dollarQuoting: false,
  customDelimiter: false,
  goDelimiter: false,
  lineComments: true,
  blockComments: true,
};

const GENERIC: DialectOptions = {
  quotes: STANDARD_QUOTES,
  eString: false,
  dollarQuoting: false,
  customDelimiter: false,
  goDelimiter: false,
  lineComments: true,
  blockComments: true,
};

const DIALECT_TABLE: Readonly<Record<Dialect, DialectOptions>> = {
  postgres: POSTGRES,
  mysql: MYSQL,
  mssql: MSSQL,
  sqlite: SQLITE,
  oracle: ORACLE,
  generic: GENERIC,
};

/**
 * Look up the option preset for a dialect. Strictly typed — pass a
 * `Dialect`. If you have an unvalidated string (e.g. a plugin manifest
 * value passed through serde), normalize it at the call site or rely on
 * the public `splitStatements` / `splitQueries` entry points which do
 * that normalization for you.
 */
export function dialectOptions(dialect: Dialect): DialectOptions {
  return DIALECT_TABLE[dialect];
}

function normalizeDialect(dialect: Dialect | string | undefined): Dialect {
  if (dialect === undefined) return 'postgres';
  return dialect in DIALECT_TABLE ? (dialect as Dialect) : 'generic';
}

/**
 * Split a SQL source into per-statement metadata. `dialect` is accepted
 * as `Dialect | string` so plugin-manifest values can flow in without
 * additional validation at the call site; unknown values fall back to
 * the `generic` preset rather than throwing.
 */
export function splitStatements(
  sql: string,
  dialect?: Dialect | string,
): Statement[] {
  return splitInto(sql, dialectOptions(normalizeDialect(dialect)));
}

export function splitQueries(
  sql: string,
  dialect?: Dialect | string,
): string[] {
  return splitStatements(sql, dialect).map((s) => s.text);
}

export {
  isSelect,
  returnsResultSet,
  isExplainable,
  stripLeadingComments,
} from './classify';
