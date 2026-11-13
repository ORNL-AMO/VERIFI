/** Browser URLs use their pathname; only Electron and explicit #/ inputs use hash routing. */
export function analyticsRoutePath(path: string): string {
  const url = new URL(path, 'https://verifi.ornl.gov');
  const usesHashRouting = (url.protocol === 'file:' || path.startsWith('#/')) && url.hash.startsWith('#/');
  return (usesHashRouting ? url.hash.slice(1) : url.pathname)
    .split(/[?#]/)[0];
}

export function isAnalyticsRouteAllowed(path: string): boolean {
  try {
    const segments = analyticsRoutePath(path).split(/[\/()]/).filter(Boolean);
    return !segments.some(segment => decodeURIComponent(segment.split(';')[0]) === 'v1');
  } catch {
    return false;
  }
}
