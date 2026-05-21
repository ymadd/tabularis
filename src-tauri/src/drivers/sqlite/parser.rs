use crate::drivers::common::parse_sql_quoted_string_list;

fn is_identifier_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// Scans a `CREATE TABLE` DDL (as stored in `sqlite_master.sql`) for a CHECK
/// constraint of the shape `<column> IN ('v1', 'v2', ...)` and returns the
/// listed values. Handles the bare, `"..."`, `` `...` `` and `[...]` quoting
/// variants of the column name. Returns `None` when no matching pattern is
/// found or when the IN list is not made of string literals.
pub(super) fn parse_sqlite_check_in_values(ddl: &str, column: &str) -> Option<Vec<String>> {
    let lower = ddl.to_ascii_lowercase();
    let col_lower = column.to_ascii_lowercase();
    let mut cursor = 0;

    while cursor < lower.len() {
        let pos = lower[cursor..].find(&col_lower)?;
        let abs_pos = cursor + pos;
        let end_pos = abs_pos + col_lower.len();

        let bytes = lower.as_bytes();
        let preceded_ok = abs_pos == 0
            || matches!(bytes[abs_pos - 1], b'"' | b'`' | b'[' | b' ' | b'(' | b',' | b'\t' | b'\n');
        let followed_ok = end_pos >= bytes.len()
            || matches!(bytes[end_pos], b'"' | b'`' | b']' | b' ' | b'\t' | b'\n')
            || !is_identifier_byte(bytes[end_pos]);

        if preceded_ok && followed_ok {
            // Skip any trailing closing quote of the identifier
            let mut probe = end_pos;
            while probe < bytes.len()
                && matches!(bytes[probe], b'"' | b'`' | b']' | b' ' | b'\t' | b'\n')
            {
                probe += 1;
            }
            // Expect "in" (case-insensitive) followed by '('
            if probe + 2 <= bytes.len() && &lower[probe..probe + 2] == "in" {
                let after_in = probe + 2;
                let mut skip = after_in;
                while skip < bytes.len() && matches!(bytes[skip], b' ' | b'\t' | b'\n') {
                    skip += 1;
                }
                if skip < bytes.len() && bytes[skip] == b'(' {
                    let inner_start = skip + 1;
                    if let Some(inner_end) = find_matching_close_paren(&ddl[inner_start..]) {
                        let inner = &ddl[inner_start..inner_start + inner_end];
                        if let Some(values) = parse_sql_quoted_string_list(inner) {
                            return Some(values);
                        }
                    }
                }
            }
        }
        cursor = end_pos;
    }
    None
}

/// Returns the index (relative to `input`) of the matching `)` that closes an
/// already-opened paren, respecting SQL single-quoted string escapes (`''`).
fn find_matching_close_paren(input: &str) -> Option<usize> {
    let bytes = input.as_bytes();
    let mut depth = 1usize;
    let mut in_quote = false;
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        if in_quote {
            if b == b'\'' {
                if i + 1 < bytes.len() && bytes[i + 1] == b'\'' {
                    i += 2;
                    continue;
                }
                in_quote = false;
            }
        } else {
            match b {
                b'\'' => in_quote = true,
                b'(' => depth += 1,
                b')' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(i);
                    }
                }
                _ => {}
            }
        }
        i += 1;
    }
    None
}

