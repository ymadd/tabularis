import { splitStatements, stripLeadingComments, isExplainable } from './sqlSplitter';

/**
 * Dialect identifier accepted by the splitter. Sourced from
 * `DriverCapabilities.sql_dialect` (Rust side); `undefined` means "use
 * the splitter default" (postgres), which matches behavior shipped
 * before the dialect was threaded through.
 */
export type SqlDialect =
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'sqlite'
  | 'oracle'
  | 'generic';

export function splitQueries(sql: string, dialect?: SqlDialect): string[] {
  return splitStatements(sql, dialect).map((s) => s.text);
}

/**
 * Strip leading SQL comments (single-line and block comments) and whitespace
 * so that the first keyword of the actual statement is at position 0.
 */
export const stripLeadingSqlComments = stripLeadingComments;

/**
 * Check if a SQL statement supports EXPLAIN.
 *
 * EXPLAIN works with DML statements (SELECT, INSERT, UPDATE, DELETE, REPLACE)
 * and CTEs (WITH). DDL statements (CREATE, DROP, ALTER, TRUNCATE, etc.) are not supported.
 * Leading SQL comments are stripped before checking.
 */
export const isExplainableQuery = isExplainable;

/**
 * Splits a SQL text into individual queries and returns only those
 * that are explainable (DML: SELECT, INSERT, UPDATE, DELETE, REPLACE, WITH, TABLE).
 *
 * `index` is 1-based over emitted statements. Comment-only fragments are
 * folded into adjacent statements (not counted), so indices line up with
 * the run-button dropdown entries the user sees.
 */
export function getExplainableQueries(
  sql: string,
  dialect?: SqlDialect,
): { query: string; index: number }[] {
  return splitStatements(sql, dialect).flatMap((s, i) =>
    s.isExplainable ? [{ query: s.text, index: i + 1 }] : [],
  );
}

/**
 * Extracts the table name from a SELECT query.
 * Handles quotes: `table`, "table", 'table', and unquoted table names.
 * Returns null if no table is found or if it's not a SELECT query.
 * Returns null for aggregate queries (COUNT, SUM, etc.) since they don't return table rows.
 */
export function extractTableName(sql: string): string | null {
  // Remove comments and normalize whitespace
  const cleaned = sql
    .replace(/--[^\n]*/g, '') // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Check if it's a SELECT query
  if (!/^\s*SELECT\s+/i.test(cleaned)) {
    return null;
  }

  // DISTINCT removes duplicates - editing a row could affect deduplication
  if (/\bSELECT\s+DISTINCT\b/i.test(cleaned)) {
    return null;
  }

  // Check if it's an aggregate query (COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING)
  // These don't return table rows, so we shouldn't fetch PK
  if (/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(cleaned) || /\bGROUP\s+BY\b/i.test(cleaned) || /\bHAVING\b/i.test(cleaned)) {
    return null;
  }

  // JOINs produce rows from multiple tables - not safely editable against a single table
  if (/\bJOIN\b/i.test(cleaned)) {
    return null;
  }

  // Set operations combine results from multiple queries
  if (/\b(UNION|INTERSECT|EXCEPT)\b/i.test(cleaned)) {
    return null;
  }

  // Subquery in FROM clause (derived table)
  if (/\bFROM\s*\(/i.test(cleaned)) {
    return null;
  }

  // Match FROM clause with optional quotes
  // Matches: FROM table, FROM `table`, FROM "table", FROM 'table'
  const fromMatch = cleaned.match(/\bFROM\s+([`"']?)(\w+)\1/i);

  if (fromMatch && fromMatch[2]) {
    return fromMatch[2];
  }

  return null;
}
