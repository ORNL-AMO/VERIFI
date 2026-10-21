import type { IconSvgObject } from './icon.types';

/** Design source: src/assets/icons/verifi-chart.svg. Keep geometry in sync. */
export const VerifiChartIcon = [
  ['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'm7 11 2.25-3.5 4.25 9.75L20 4.5m-4.25 1.25L20 4.5l1.25 4.25', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }]
] as const satisfies IconSvgObject;

export const CUSTOM_ICONS = { dataVisualization: VerifiChartIcon };
