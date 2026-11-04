import { Injectable } from '@angular/core';

export const BETTER_PLANTS_TEMPLATES = {
  energy: 'BBBP-Challenge-Annual-Reporting-Form',
  water: 'BBBP-Water-Data-Collection-Form-modified'
} as const;

export interface BetterPlantsImages { readonly banner: string; readonly footer: string; }

@Injectable({ providedIn: 'root' })
export class BetterPlantsAssets {
  template(category: 'energy' | 'water', signal?: AbortSignal): Promise<ArrayBuffer> {
    return loadBetterPlantsAsset(`assets/csv_templates/${BETTER_PLANTS_TEMPLATES[category]}.xlsx`, signal);
  }

  async images(signal?: AbortSignal): Promise<BetterPlantsImages> {
    const [banner, footer] = await Promise.all([
      loadBetterPlantsAsset('assets/images/better-plants-report-banner.jpg', signal),
      loadBetterPlantsAsset('assets/images/better-plants-report-footer.png', signal)
    ]);
    return { banner: imageData(banner, 'image/jpeg'), footer: imageData(footer, 'image/png') };
  }
}

/** XHR also supports the bundled relative file URLs used by the Electron renderer. */
export function loadBetterPlantsAsset(path: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason ?? new DOMException('Export cancelled.', 'AbortError')); return; }
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    request.open('GET', path, true);
    request.responseType = 'arraybuffer';
    request.timeout = 30000;
    request.onload = () => {
      cleanup();
      const validStatus = (request.status >= 200 && request.status < 300) || request.status === 0;
      if (!validStatus || !(request.response instanceof ArrayBuffer) || !request.response.byteLength) {
        reject(new Error('The bundled Better Plants export asset could not be loaded. Reload VERIFI and try again.'));
      } else resolve(request.response);
    };
    request.onerror = request.ontimeout = () => { cleanup(); reject(new Error('The bundled Better Plants export asset could not be loaded. Reload VERIFI and try again.')); };
    request.onabort = () => { cleanup(); reject(signal?.reason ?? new DOMException('Export cancelled.', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    request.send();
  });
}

function imageData(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return `data:${mimeType};base64,${btoa(binary)}`;
}
