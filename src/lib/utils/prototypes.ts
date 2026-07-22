import type { TableRule } from "../types";

export function xyArrRule(
  name: string,
  label: string,
  mandatory = true,
): TableRule {
  return {
    name,
    label,
    type: "arr",
    fixedSize: 2,
    isMandatory: mandatory,
    allowSort: false,
    editable: true,
  };
}

// Reused for dataPosition / dataNormal (Hotspot, Tourspot): fixed 3-number arrays.
export function xyzArrRule(
  name: string,
  label: string,
  mandatory = true,
): TableRule {
  return {
    name,
    label,
    type: "arr",
    fixedSize: 3,
    isMandatory: mandatory,
    allowSort: false,
    editable: true,
  };
}

export const idRule = (label = "ID"): TableRule => ({
  name: "id",
  label,
  isMandatory: true,
  allowSort: true,
  editable: false,
});
