export function buildShareUrl(webBaseUrl: string, shareToken: string): string {
  return `${webBaseUrl.replace(/\/+$/, '')}/k/${shareToken}`;
}

/** Liefert den Share-Token aus einem Pfad wie `/k/<token>` oder `/k/<token>/5`. */
export function parseCalendarPath(pathname: string): { token: string; day: number | null } | null {
  const match = /^\/k\/([A-Za-z0-9_-]+)(?:\/(\d{1,2}))?\/?$/.exec(pathname);
  if (!match) return null;
  const day = match[2] ? Number(match[2]) : null;
  return { token: match[1], day: day !== null && day >= 1 && day <= 24 ? day : null };
}
