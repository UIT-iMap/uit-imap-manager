export function objectToJson(object: unknown, pretty = true): string {
  try {
    return JSON.stringify(object, null, pretty ? 2 : undefined);
  } catch {
    return "";
  }
}

export function jsonToObject<T = any>(json: string): T {
  return JSON.parse(json) as T;
}

export function tryJsonToObject<T = any>(
  json: string
): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(json) as T };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function downloadJson(filename: string, data: unknown) {
  const json = objectToJson(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
