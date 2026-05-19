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
    { open: '[', close: ']', doubleClose: false },
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

export function dialectOptions(dialect: Dialect): DialectOptions {
  return DIALECT_TABLE[dialect];
}

export function splitStatements(
  sql: string,
  dialect: Dialect = 'postgres',
): Statement[] {
  return splitInto(sql, dialectOptions(dialect));
}

export function splitQueries(
  sql: string,
  dialect: Dialect = 'postgres',
): string[] {
  return splitStatements(sql, dialect).map((s) => s.text);
}

export {
  isSelect,
  returnsResultSet,
  isExplainable,
  stripLeadingComments,
} from './classify';
