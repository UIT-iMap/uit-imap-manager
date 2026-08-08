import type { OnBlurFn, TableRule } from "../types";

export function xyArrRule(
  name: string,
  label: string,
  mandatory = true,
  onBlurs?: OnBlurFn[],
): TableRule {
  return {
    name,
    label,
    type: "arr",
    fixedSize: 2,
    isMandatory: mandatory,
    allowSort: false,
    editable: true,
    onBlurs,
  };
}

// Reused for dataPosition / dataNormal (Hotspot, Tourspot): fixed 3-number arrays.
export function xyzArrRule(
  name: string,
  label: string,
  mandatory = true,
  onBlurs?: OnBlurFn[],
): TableRule {
  return {
    name,
    label,
    type: "arr",
    fixedSize: 3,
    isMandatory: mandatory,
    allowSort: false,
    editable: true,
    onBlurs,
  };
}

export const idRule = (label = "ID", onBlurs?: OnBlurFn[]): TableRule => ({
  name: "id",
  label,
  isMandatory: true,
  allowSort: true,
  editable: false,
  onBlurs,
});
