/**
 * Checks that `value` does not already exist among `existingValues`
 * (used to validate primary-key uniqueness before insert/edit).
 */
export function isUniqueValue(
  value: any,
  existingValues: any[],
  ignoreIndex?: number
): boolean {
  return !existingValues.some(
    (v, idx) => idx !== ignoreIndex && String(v) === String(value)
  );
}

/**
 * Checks that `foreignValue` references an existing value in `primaryValues`
 * (used to validate foreign-key integrity, e.g. Room.belongsTo -> Hotspot.id).
 */
export function isValidRef(foreignValue: any, primaryValues: any[]): boolean {
  if (foreignValue === undefined || foreignValue === null || foreignValue === "")
    return true; // optional refs are valid when empty; pair with isValidMandatory for required refs
  return primaryValues.some((v) => String(v) === String(foreignValue));
}

/**
 * Checks that a required field has a non-empty value.
 */
export function isValidMandatory(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every((v) => v !== "" && v !== null && v !== undefined);
  return true;
}

/**
 * Checks a fixed-size array field has exactly `size` populated entries.
 */
export function isValidFixedArray(value: any, size: number): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length !== size) return false;
  return value.every((v) => v !== "" && v !== null && v !== undefined);
}
