/** Normalize both browser paths and Electron file URLs with hash routing. */
export function analyticsRoutePath(path: string): string {
  const url = new URL(path, 'https://verifi.ornl.gov');
  return (url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname)
    .split(/[?#]/)[0];
}

export function isAnalyticsRouteAllowed(path: string): boolean {
  try {
    const segments = analyticsRoutePath(path).split(/[\/()]/).filter(Boolean);
    return !segments.some(segment => ['v1', 'p1'].includes(decodeURIComponent(segment.split(';')[0])));
  } catch {
    return false;
  }
}
