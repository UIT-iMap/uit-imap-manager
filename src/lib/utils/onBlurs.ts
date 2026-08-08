import {
  ON_BLUR_STATUS,
  type Hotspot,
  type OnBlurFn,
  type OnBlurResult,
} from "../types";

/**
 * Checks whether a value is considered populated / non-empty.
 */
export function isPopulated(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.every((v) => v !== "" && v !== null && v !== undefined)
    );
  }
  return true;
}

/**
 * Checks whether a value is an array with exactly `size` populated entries.
 */
export function isFixedArray(value: any, size: number): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length !== size) return false;
  return value.every((v) => v !== "" && v !== null && v !== undefined);
}

/**
 * isValidPrimaryKey: Checks if a value is unique within an array of values. Used to check ID.
 * Returns status 1 (fail) if duplicate is found.
 */
export function isValidPrimaryKey(
  existingValues: any[] | (() => any[]) = [],
): OnBlurFn {
  return (row: any, attributes: string[]): OnBlurResult => {
    const list =
      typeof existingValues === "function" ? existingValues() : existingValues;
    for (const attr of attributes) {
      const val = row ? row[attr] : undefined;
      if (val === undefined || val === null || val === "") continue;

      const isSelf =
        row &&
        row._originalId !== undefined &&
        String(val) === String(row._originalId);

      if (!isSelf && list.some((v: any) => String(v) === String(val))) {
        return {
          status: ON_BLUR_STATUS.FAIL,
          message: `"${val}" already exists. Must be unique.`,
        };
      }
    }
    return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
  };
}

/**
 * isValidForeignKey: Checks if a value exists within an array of primary values.
 * Returns status 1 (fail) if value is present but not in the reference list.
 */
export function isValidForeignKey(
  primaryValues: any[] | (() => any[]) = [],
): OnBlurFn {
  return (row: any, attributes: string[]): OnBlurResult => {
    const list =
      typeof primaryValues === "function" ? primaryValues() : primaryValues;
    for (const attr of attributes) {
      const val = row ? row[attr] : undefined;
      if (val === undefined || val === null || val === "") continue;

      if (Array.isArray(val)) {
        for (const item of val) {
          if (
            item !== undefined &&
            item !== null &&
            item !== "" &&
            !list.some((v: any) => String(v) === String(item))
          ) {
            return {
              status: ON_BLUR_STATUS.FAIL,
              message: `"${item}" does not exist.`,
            };
          }
        }
      } else {
        if (!list.some((v: any) => String(v) === String(val))) {
          return {
            status: ON_BLUR_STATUS.FAIL,
            message: `"${val}" does not exist.`,
          };
        }
      }
    }
    return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
  };
}

/**
 * uppercase: Receives a string and returns uppercase, or transforms row attribute(s) to uppercase.
 */
export function uppercase(arg1: any, arg2?: string[]): any {
  if (typeof arg1 === "string" && !arg2) {
    return arg1.toUpperCase();
  }
  if (arg1 && Array.isArray(arg2)) {
    for (const attr of arg2) {
      if (typeof arg1[attr] === "string") {
        arg1[attr] = arg1[attr].toUpperCase();
      }
    }
  }
  return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
}

/**
 * hasGates: For Room, checks if gates exist.
 * If not, warning: "This room can't be navigated."
 */
export const hasGates: OnBlurFn = (
  row: any,
  _attributes: string[],
): OnBlurResult => {
  const gates = row?.gates;
  const exists =
    Array.isArray(gates) &&
    gates.length > 0 &&
    gates.some((g: any) => g !== "" && g !== null && g !== undefined);
  if (!exists) {
    return {
      status: ON_BLUR_STATUS.WARNING,
      message: "This room can't be navigated.",
    };
  }
  return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
};

/**
 * hasBelongsTo: For Room, checks if belongsTo exists.
 * If not, warning: "This room can't be searched for."
 */
export const hasBelongsTo: OnBlurFn = (
  row: any,
  _attributes: string[],
): OnBlurResult => {
  const belongsTo = row?.belongsTo;
  if (
    belongsTo === undefined ||
    belongsTo === null ||
    (typeof belongsTo === "string" && belongsTo.trim() === "")
  ) {
    return {
      status: ON_BLUR_STATUS.WARNING,
      message: "This room can't be searched for.",
    };
  }
  return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
};

/**
 * hasPosition: For Room, checks if floor - rows - cols exist.
 * If not, warning: "This room can't be displayed on the building plan."
 */
export const hasPosition: OnBlurFn = (
  row: any,
  _attributes: string[],
): OnBlurResult => {
  const hasFloor =
    row?.floor !== undefined &&
    row?.floor !== null &&
    String(row.floor).trim() !== "";
  const hasRows =
    Array.isArray(row?.rows) &&
    row.rows.length === 2 &&
    row.rows.every((r: any) => r !== "" && r !== null && r !== undefined);
  const hasCols =
    Array.isArray(row?.cols) &&
    row.cols.length === 2 &&
    row.cols.every((c: any) => c !== "" && c !== null && c !== undefined);

  if (!hasFloor || !hasRows || !hasCols) {
    return {
      status: ON_BLUR_STATUS.WARNING,
      message: "This room can't be displayed on the building plan.",
    };
  }
  return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
};

/**
 * hasBelongsHotpotName: For Room, checks if the hotspot referenced by belongsTo has a name.
 * If not, warning: "The hotspot this room points to has no name."
 */
export function hasBelongsHotpotName(
  hotspots: Hotspot[] | (() => Hotspot[]) = [],
): OnBlurFn {
  return (row: any, _attributes: string[]): OnBlurResult => {
    const belongsTo = row?.belongsTo;
    if (!belongsTo || String(belongsTo).trim() === "") {
      return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
    }
    const list = typeof hotspots === "function" ? hotspots() : hotspots;
    const targetHotspot = list.find(
      (h: any) => String(h.id) === String(belongsTo),
    );
    if (targetHotspot && (!targetHotspot.name || targetHotspot.name.trim() === "")) {
      return {
        status: ON_BLUR_STATUS.WARNING,
        message: "The hotspot this room points to has no name.",
      };
    }
    return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
  };
}

export const hasBelongsHotspotName = hasBelongsHotpotName;

/**
 * hasCategory: For Room, checks if category exists without floor - rows - cols.
 * If category is present but floor/rows/cols missing, warning:
 * "Setting this attribute is pointless because it is not displayed in the building plan."
 */
export const hasCategory: OnBlurFn = (
  row: any,
  _attributes: string[],
): OnBlurResult => {
  const category = row?.category;
  if (!category || String(category).trim() === "") {
    return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
  }

  const hasFloor =
    row?.floor !== undefined &&
    row?.floor !== null &&
    String(row.floor).trim() !== "";
  const hasRows =
    Array.isArray(row?.rows) &&
    row.rows.length === 2 &&
    row.rows.every((r: any) => r !== "" && r !== null && r !== undefined);
  const hasCols =
    Array.isArray(row?.cols) &&
    row.cols.length === 2 &&
    row.cols.every((c: any) => c !== "" && c !== null && c !== undefined);

  if (!hasFloor || !hasRows || !hasCols) {
    return {
      status: ON_BLUR_STATUS.WARNING,
      message:
        "Setting this attribute is pointless because it is not displayed in the building plan.",
    };
  }
  return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
};

export const hasCategoryPosition = hasCategory;

/**
 * isValidMandatory: Checks if a mandatory field has a non-empty value.
 * Returns status 1 (fail) if empty.
 */
export function isValidMandatory(
  arg1?: any,
  arg2?: string[],
): any {
  if (Array.isArray(arg2)) {
    // Called as OnBlurFn: isValidMandatory(row, attributes)
    const row = arg1;
    const attributes = arg2;
    for (const attr of attributes) {
      const val = row ? row[attr] : undefined;
      if (!isPopulated(val)) {
        return {
          status: ON_BLUR_STATUS.FAIL,
          message: `"${attr}" is required.`,
        };
      }
    }
    return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
  }
  // Called as direct boolean check: isValidMandatory(value)
  return isPopulated(arg1);
}

/**
 * isValidFixedArray: Checks if a fixed-size array field has exactly `size` populated entries.
 * Returns status 1 (fail) if invalid.
 */
export function isValidFixedArray(
  arg1: any,
  arg2?: any,
  arg3?: string[],
): any {
  if (typeof arg1 === "number" && !arg2 && !arg3) {
    // Factory: isValidFixedArray(size) -> returns OnBlurFn
    const size = arg1;
    return (row: any, attributes: string[]): OnBlurResult => {
      for (const attr of attributes) {
        const val = row ? row[attr] : undefined;
        if (!isFixedArray(val, size)) {
          return {
            status: ON_BLUR_STATUS.FAIL,
            message: `"${attr}" must have exactly ${size} values.`,
          };
        }
      }
      return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
    };
  }

  if (Array.isArray(arg3)) {
    // Called as: isValidFixedArray(size, row, attributes)
    const size = arg1;
    const row = arg2;
    const attributes = arg3;
    for (const attr of attributes) {
      const val = row ? row[attr] : undefined;
      if (!isFixedArray(val, size)) {
        return {
          status: ON_BLUR_STATUS.FAIL,
          message: `"${attr}" must have exactly ${size} values.`,
        };
      }
    }
    return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
  }

  // Direct boolean check: isValidFixedArray(value, size)
  return isFixedArray(arg1, arg2);
}
