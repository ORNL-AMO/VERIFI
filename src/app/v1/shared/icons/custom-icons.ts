import type { IconSvgObject } from './icon.types';

/** Design source: src/assets/icons/verifi-chart.svg. Keep geometry in sync. */
export const VerifiChartIcon = [
  ['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'm7 11 2.25-3.5 4.25 9.75L20 4.5m-4.25 1.25L20 4.5l1.25 4.25', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }]
] as const satisfies IconSvgObject;

/** Design source: src/assets/icons/better-plants-report.svg. Keep geometry in sync. */
export const BetterPlantsReportIcon = [
  ['path', { d: 'M13 2.5V3C13 5.82843 13 7.24264 13.8787 8.12132C14.7574 9 16.1716 9 19 9H19.5M20 10.6569V11M8 22C5 22 4 20.5 4 17V9.45584C4 6.21082 4 4.58831 4.88607 3.48933C5.06508 3.26731 5.26731 3.06508 5.48933 2.88607C6.58831 2 8.21082 2 11.4558 2C12.1614 2 12.5141 2 12.8372 2.11401C12.9044 2.13772 12.9702 2.165 13.0345 2.19575C13.3436 2.34355 13.593 2.593 14.0919 3.09188L18.8284 7.82843C19.4065 8.40649 19.6955 8.69552 19.8478 9.06306C20 9.4306 20 9.83935 20 10.6569', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }],
  ['path', { d: 'M10.5 21v-7h1.7c2.8 0 2.8 3.5 0 3.5h-1.7m1.7 0c2.8 0 2.8 3.5 0 3.5h-1.7M17 21v-7h1.8c2.9 0 2.9 3.5 0 3.5H17', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }]
] as const satisfies IconSvgObject;

export const CUSTOM_ICONS = { dataVisualization: VerifiChartIcon, betterPlantsReport: BetterPlantsReportIcon };
