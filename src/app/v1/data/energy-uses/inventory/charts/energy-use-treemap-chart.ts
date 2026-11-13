import type { TreemapSeriesOption } from 'echarts/charts';
import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import type { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { energyUsePercent, type EnergyUseTreemapNode } from '../../models/energy-use-projection.models';
import { energyUseChartColor } from '../../models/energy-use-results.models';
import { treemapUsageShares, type EnergyUseTreemapResults } from './energy-use-treemap-results.models';

export const ENERGY_USE_TREEMAP_ROOT = 'energy-use-treemap-root';

interface TreemapAppearance { readonly color: string; readonly text: string; }
type DisplayNode = EnergyUseTreemapNode & { readonly groupShare: number | null; readonly facilityShare: number | null;
  readonly accountShare: number | null; readonly sharesPartial: boolean };

export function formatTreemapPercentage(value: number, compact = false): string {
  if (value > 0 && value < 1) return '<1%';
  return (compact ? Number(value.toPrecision(2)).toLocaleString(undefined, { maximumFractionDigits: 3 })
    : value.toLocaleString(undefined, { maximumFractionDigits: 0 })) + '%';
}

function groupAppearance(color: string | undefined, identity: string): TreemapAppearance {
  if (!color || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) return { color: energyUseChartColor(identity), text: 'var(--v1-surface)' };
  const hex = color.length === 4 ? color.slice(1).split('').map(value => value + value).join('') : color.slice(1);
  const channels = [0, 2, 4].map(index => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return { color, text: luminance > .179 ? '#000000' : '#ffffff' };
}

/** Chart presentation only: keep period-scoped percentages and inherited group colors. */
export function energyUseTreemapOption(nodes: readonly EnergyUseTreemapNode[], groups: readonly Readonly<IdbFacilityEnergyUseGroup>[], title: string, unit: string, facilityScoped: boolean, results: EnergyUseTreemapResults): V1EChartsOption {
  const savedGroups = new Map(groups.map(group => [JSON.stringify([group.facilityId, group.guid]), group]));
  const neutral: TreemapAppearance = { color: 'var(--v1-content-block)', text: 'var(--v1-text)' };
  const groupTotals = new Map<string, number>();
  for (const row of results.rows) {
    const saved = savedGroups.get(JSON.stringify([row.facility.guid, row.item.energyUseGroupId]));
    const key = JSON.stringify([row.facility.guid, saved?.accountId === row.item.accountId ? row.item.energyUseGroupId : 'unavailable']);
    groupTotals.set(key, (groupTotals.get(key) ?? 0) + row.amount);
  }
  const chartNode = (node: EnergyUseTreemapNode, inherited = neutral): NonNullable<TreemapSeriesOption['data']>[number] => {
    const saved = node.kind === 'group' ? savedGroups.get(JSON.stringify([node.facilityGuid, node.groupGuid])) : undefined;
    const appearance = node.kind === 'group' ? groupAppearance(saved?.color?.trim(), node.id) : inherited;
    const data = { ...node, name: node.kind === 'period' ? 'Energy Uses' : node.name,
      groupShare: node.kind === 'item' ? energyUsePercent(node.value, groupTotals.get(JSON.stringify([node.facilityGuid, node.groupGuid])) ?? 0) : null,
      ...treemapUsageShares(node, results),
      itemStyle: { color: appearance.color, borderColor: node.children?.length ? appearance.color : 'var(--v1-surface)' },
      label: { color: appearance.text }, upperLabel: { color: appearance.text, show: node.kind !== 'period', height: node.kind === 'period' ? 0 : 24 },
      children: node.children?.filter(child => child.value > 0).map(child => chartNode(child, appearance)) };
    return data;
  };
  // This wrapper supplies geometry and the v0-style context band, not a reported
  // portfolio total: its children can represent incompatible actual fiscal periods.
  const root = { id: ENERGY_USE_TREEMAP_ROOT, name: title, kind: 'context',
    children: nodes.filter(node => node.value > 0).map(node => chartNode(node)),
    itemStyle: { color: neutral.color, borderColor: neutral.color }, label: { color: neutral.text }, upperLabel: { color: neutral.text } };
  const amount = (value: number | null) => value === null ? 'Unavailable' : `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${unit}/yr`;
  const share = (value: number | null, name: string) => value === null ? `${name}: Unavailable` : `${formatTreemapPercentage(value)} of ${name}`;
  return { animation: false, legend: { show: false }, tooltip: { renderMode: 'richText', formatter: params => {
    const data = (Array.isArray(params) ? params[0] : params).data as DisplayNode | { kind: 'context'; name: string } | undefined;
    if (!data) return '';
    if (!data.kind) return data.name ?? title;
    if (data.kind === 'context') return data.name;
    return `${data.name}\n${amount(data.value)}${data.facilityShare == null ? '' : '\n' + share(data.facilityShare, 'Facility Usage')}\n${share(data.accountShare, 'Account Usage')}${results.accountComparable ? '' : ' · different fiscal calendars'}${data.groupShare == null ? '' : '\n' + share(data.groupShare, 'Group Usage')}${data.partial || data.sharesPartial ? '\nPartial equipment data · known contributions only' : ''}`;
  } }, series: [{ type: 'treemap', name: title, animation: false, animationDurationUpdate: 0,
    left: 0, right: 0, top: 0, bottom: 0, data: [root], nodeClick: false, roam: false,
    breadcrumb: { show: false }, sort: 'desc', visibleMin: 0, childrenVisibleMin: 0,
    levels: [{ upperLabel: { show: false }, itemStyle: { borderWidth: 0, gapWidth: 0 } }],
    emphasis: { disabled: true },
    label: { show: true, position: 'inside', fontSize: 12, opacity: 1, overflow: 'break', lineOverflow: 'truncate',
      formatter: params => { const data = params.data as DisplayNode; const value = facilityScoped ? data.facilityShare : data.accountShare ?? data.facilityShare;
        return `${data.name}${data.kind === 'item' && value != null ? '\n' + formatTreemapPercentage(value, true) : ''}`; } },
    upperLabel: { show: true, height: 24, fontSize: 12, opacity: 1, position: ['50%', '50%'], align: 'center', verticalAlign: 'middle', overflow: 'truncate' },
    itemStyle: { borderColor: 'var(--v1-surface)', borderWidth: 2, gapWidth: 2 }
  }] };
}
