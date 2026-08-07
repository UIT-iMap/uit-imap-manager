/**
 * Converts a non-negative integer index into an alphabetical string with at least 2 characters.
 * Sequence:
 * 0 -> "AA", 1 -> "AB", ..., 25 -> "AZ",
 * 26 -> "BA", ..., 675 -> "ZZ",
 * 676 -> "AAA", ..., etc.
 */
export function indexToAlpha(index: number): string {
  let len = 2;
  let count = Math.pow(26, len);
  let rem = index;

  while (rem >= count) {
    rem -= count;
    len++;
    count = Math.pow(26, len);
  }

  let result = "";
  for (let i = len - 1; i >= 0; i--) {
    const power = Math.pow(26, i);
    const charIndex = Math.floor(rem / power);
    result += String.fromCharCode(65 + charIndex);
    rem %= power;
  }
  return result;
}

/**
 * Generates an alphabetical ID (at least 2 characters) that does not conflict
 * with any ID in the provided list of existing IDs.
 *
 * @param existingIds List of existing IDs to check against for collisions.
 * @returns A unique alphabetical string ID (e.g. "AA", "AB", "AC", ...).
 */
export function genId(existingIds: (string | number | undefined | null)[]): string {
  const existingSet = new Set(
    (existingIds || [])
      .filter((id) => id !== undefined && id !== null && String(id).trim() !== "")
      .map((id) => String(id).trim().toUpperCase())
  );

  let idx = 0;
  while (true) {
    const candidate = indexToAlpha(idx);
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    idx++;
  }
}
