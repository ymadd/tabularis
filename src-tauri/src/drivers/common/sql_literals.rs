/// Parses a comma-separated list of SQL single-quoted string literals such as
/// `'a', 'b', 'c''d'` and returns the unescaped values.
///
/// Returns `None` when any element is not a quoted string literal (e.g. a
/// number or expression), the input contains an unterminated literal, or the
/// resulting list is empty. The `''` sequence inside a literal is collapsed
/// to a single quote, matching the standard SQL escape rule shared by MySQL,
/// SQLite, PostgreSQL and MSSQL.
pub fn parse_sql_quoted_string_list(input: &str) -> Option<Vec<String>> {
    let mut values = Vec::new();
    let mut chars = input.chars().peekable();
    while let Some(&c) = chars.peek() {
        if c.is_whitespace() || c == ',' {
            chars.next();
            continue;
        }
        if c != '\'' {
            return None;
        }
        chars.next();
        let mut value = String::new();
        loop {
            match chars.next() {
                Some('\'') => {
                    if chars.peek() == Some(&'\'') {
                        value.push('\'');
                        chars.next();
                    } else {
                        break;
                    }
                }
                Some(ch) => value.push(ch),
                None => return None,
            }
        }
        values.push(value);
    }
    if values.is_empty() {
        None
    } else {
        Some(values)
    }
}
