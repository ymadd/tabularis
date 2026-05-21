import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface EnumSelectProps {
  value: unknown;
  options: string[];
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * `<select>` used during cell editing for columns whose schema declares an
 * enum/SET (MySQL), enum type (PostgreSQL) or `CHECK(col IN (...))`
 * constraint (SQLite). Values not in the option list (e.g. legacy rows) are
 * surfaced as a non-removable entry so they remain editable.
 */
export const EnumSelect: React.FC<EnumSelectProps> = ({
  value,
  options,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus = false,
  className = "",
}) => {
  const { t } = useTranslation();
  const selectRef = useRef<HTMLSelectElement>(null);

  const currentValue =
    value === null || value === undefined ? "" : String(value);
  const isLegacyValue = currentValue !== "" && !options.includes(currentValue);
  const items = isLegacyValue ? [currentValue, ...options] : options;

  useEffect(() => {
    if (autoFocus) selectRef.current?.focus();
  }, [autoFocus]);

  return (
    <select
      ref={selectRef}
      value={currentValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={`w-full bg-base text-primary font-mono outline-none ${className}`}
    >
      {currentValue === "" && !options.includes("") && (
        <option value="" disabled>
          —
        </option>
      )}
      {items.map((opt) => (
        <option key={opt} value={opt}>
          {opt === currentValue && isLegacyValue
            ? `${opt} ${t("dataGrid.enumLegacyValueSuffix", { defaultValue: "(not in enum)" })}`
            : opt}
        </option>
      ))}
    </select>
  );
};
