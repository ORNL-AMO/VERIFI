import { UtilityColors } from 'src/app/shared/utilityColors';
import { SankeyData, SankeyLink, SankeyNode } from 'src/app/models/visualization';

/**
 * Formats an energy value with its unit for display in Sankey chart labels.
 * Uses locale-aware number formatting with no decimal places.
 */
export function formatEnergyValue(value: number, unit: string = 'MMBtu'): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${unit}`;
}

/**
 * Returns the display color for a given energy source name.
 * Uses the UtilityColors mapping; falls back to steel blue if the source is unknown.
 */
export function getSourceColor(source: string): string {
  return UtilityColors[source]?.color || '#4682B4';
}

/**
 * Returns a consistent color for an equipment group node.
 * 'Unaccounted' energy gets a neutral grey; all other groups are assigned a color
 * from a preset palette using a simple hash of the group name so the same group
 * always receives the same color across renders.
 */
export function getEquipmentGroupColor(groupName: string): string {
  if (groupName === 'Unaccounted') {
    return '#D3D3D3';
  }
  const colors = ['#87CEEB', '#DDA0DD', '#F0E68C', '#98FB98', '#FFA07A', '#87CEFA', '#F5DEB3'];
  const hash = groupName.split('').reduce((acc, char) => {
    acc = ((acc << 5) - acc) + char.charCodeAt(0);
    return acc & acc;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Returns an rgba color string for a Sankey link, derived from the source's base color.
 * - Unaccounted energy links are rendered at lower opacity (0.2) to visually de-emphasize them.
 * - A custom opacity value can be provided to override the default (0.4).
 */
export function getLinkColor(source: string, isUnaccounted = false, customOpacity?: number): string {
  const baseColor = getSourceColor(source);
  const opacity = customOpacity ?? (isUnaccounted ? 0.2 : 0.4);
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Assembles the Plotly-compatible SankeyData object from arrays of nodes and links.
 * This is the final step before passing data to Plotly's rendering engine.
 */
export function buildSankeyData(nodes: SankeyNode[], links: SankeyLink[]): SankeyData {
  return {
    type: 'sankey',
    node: {
      pad: 15,
      thickness: 20,
      line: { color: '#333', width: 0.5 },
      label: nodes.map(n => n.label),
      color: nodes.map(n => n.color)
    },
    link: {
      source: links.map(l => l.source),
      target: links.map(l => l.target),
      value: links.map(l => l.value),
      color: links.map(l => l.color)
    }
  };
}
