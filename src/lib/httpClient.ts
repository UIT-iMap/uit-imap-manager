export const BASE_URL = "https://cdn.jsdelivr.net/gh/helitoo/uit-imap-data/";

export async function httpGet<T>(endpoint: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(BASE_URL + endpoint, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`httpGet fallback for ${endpoint}:`, err);
    return fallback;
  }
}

export function resolveUrl(endpoint: string): string {
  return BASE_URL + endpoint;
}

export const ENDPOINTS = {
  hotspots: "hotspots.json",
  rooms: "rooms.json",
  edges: "hotspot-edges.json",
  tourScenes: "tour-scenes.json",
  tourspots: "tourspots.json",
  transport: "transport.json",
} as const;
