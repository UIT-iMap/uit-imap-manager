export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getSceneShareUrl(sceneId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("sceneId", sceneId);
  return url.toString();
}
