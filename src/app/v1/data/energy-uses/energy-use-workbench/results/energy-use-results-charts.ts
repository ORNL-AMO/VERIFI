import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { EnergyUseAnnualResult, energyUseChartColor, energyUseSourceBreakdown } from '../../models/energy-use-results.models';
import { FacilityEnergyUseResult } from '../../models/facility-energy-use-results.models';
import { FacilityEnergyUseBalance } from '../../models/facility-energy-use-balance.models';
import { energyUsePercent } from '../../models/energy-use-projection.models';

export interface EnergyUseFlowLink { readonly source: string; readonly target: string; readonly value: number; }
export function energyUseFlow(result: EnergyUseAnnualResult) {
  return energyUseSourceBreakdown(result).flatMap(group => group.items.flatMap(item =>
    item.amount !== null && item.amount > 0 ? [{ source: `source:${group.source}`, target: `item:${item.item.guid}`, value: item.amount } satisfies EnergyUseFlowLink] : []
  )).sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
}

const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 6 });
const percent = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const coverageNote = (row: EnergyUseAnnualResult['items'][number]) => [
  row.projection.partial ? '\nPartial coverage · known values only' : '',
  row.projection.sources.some(source => source.state === 'inactive') ? '\nInactive sources' : ''
].join('');
const tooltip: V1EChartsOption['tooltip'] = { trigger: 'item', renderMode: 'richText', formatter: params => {
  const point = (Array.isArray(params) ? params[0] : params).data as { description?: string };
  return point?.description ?? '';
} };

export function energyUseFlowOption(result: EnergyUseAnnualResult, unit: string): V1EChartsOption {
  return energyUseSankeyOption(energyUseFlow(result), result.items.map(item => ({
    id: `item:${item.projection.item.guid}`, label: item.projection.item.name, amount: item.amount,
    colorKey: item.projection.item.guid,
    description: `${item.projection.item.name}\n${number(item.amount ?? 0)} ${unit}${coverageNote(item)}`
  })), result.year, result.partial, unit);
}

export function facilityEnergyUseFlowOption(result: FacilityEnergyUseResult, unit: string, balance?: FacilityEnergyUseBalance): V1EChartsOption {
  const links = result.sources.flatMap(source => source.groups.flatMap(group => group.amount !== null && group.amount > 0
    ? [{ source: `source:${source.source}`, target: `group:${group.group.guid}`, value: group.amount }] : []));
  const targets: EnergyUseFlowTarget[] = result.groups.map(group => {
    const share = balance?.complete ? energyUsePercent(group.amount, balance.consumption ?? 0) : group.percent;
    return { id: `group:${group.group.guid}`, label: group.group.name, amount: group.amount, colorKey: group.group.id,
      description: `${group.group.name}\n${group.amount === null ? 'Unavailable' : number(group.amount) + ' ' + unit}\n${share === null ? 'Share unavailable' : percent(share) + (balance?.complete ? '% of Facility Usage' : '% of Known Equipment Use')}${group.partial ? '\nPartial coverage · known values only' : ''}` };
  });
  const sourceDescriptions = new Map<string, string>();
  for (const source of balance?.sources ?? []) {
    const residual = source.unaccounted;
    sourceDescriptions.set(`source:${source.source}`, `${source.source}\nMetered Consumption: ${source.consumption === null ? 'Unavailable' : number(source.consumption) + ' ' + unit}\nEquipment use: ${number(source.equipment)} ${unit}${residual === null ? '\nBalance unavailable · incomplete utility data' : `\n${residual < 0 ? 'Over allocated' : 'Unaccounted'}: ${number(Math.abs(residual))} ${unit}`}`);
    if (residual === null || residual <= Number.EPSILON * 16 * Math.max(1, Math.abs(source.consumption ?? 0), source.equipment)) continue;
    const id = `unaccounted:${source.source}`;
    links.push({ source: `source:${source.source}`, target: id, value: residual });
    targets.push({ id, label: `Unaccounted · ${source.source}`, amount: residual, colorKey: 'unaccounted',
      description: `Unaccounted · ${source.source}\n${number(residual)} ${unit}\nFY ${result.year}${result.partial ? '\nBased on known equipment contributions only' : ''}` });
  }
  return energyUseSankeyOption(links, targets, result.year, result.partial || (!!balance && !balance.complete), unit, sourceDescriptions);
}

interface EnergyUseFlowTarget {
  readonly id: string;
  readonly label: string;
  readonly amount: number | null;
  readonly colorKey: string;
  readonly description: string;
}

function energyUseSankeyOption(links: readonly EnergyUseFlowLink[], targets: readonly EnergyUseFlowTarget[], year: number, partial: boolean, unit: string, sourceDescriptions?: ReadonlyMap<string, string>): V1EChartsOption {
  const sources = [...new Set(links.map(link => link.source))].sort();
  const sourceOrder = new Map(sources.map((source, index) => [source, index]));
  const incoming = new Map<string, EnergyUseFlowLink[]>();
  for (const link of links) {
    const contributions = incoming.get(link.target) ?? [];
    contributions.push(link);
    incoming.set(link.target, contributions);
  }
  // Keep single-source equipment in matching source blocks. Shared equipment sits
  // between its supplying sources, nearer the source providing more consumption.
  const orderedItems = targets.flatMap(item => {
    const contributions = incoming.get(item.id);
    if (!contributions?.length) return [];
    const total = contributions.reduce((sum, link) => sum + link.value, 0);
    const position = contributions.reduce((sum, link) => sum + sourceOrder.get(link.source)! * (link.value / total), 0);
    return [{ item, position, shared: contributions.length > 1 }];
  }).sort((a, b) => a.position - b.position || Number(a.shared) - Number(b.shared)
    || a.item.label.localeCompare(b.item.label)
    || a.item.id.localeCompare(b.item.id));
  const nodes = sources.map(name => ({ name, value: links.filter(link => link.source === name).reduce((sum, link) => sum + link.value, 0),
    label: { formatter: name.slice(7) }, description: sourceDescriptions?.get(name) ?? `${name.slice(7)}\n${number(links.filter(link => link.source === name).reduce((sum, link) => sum + link.value, 0))} ${unit}`,
    itemStyle: { color: energyUseChartColor(name) } }));
  for (const { item } of orderedItems) {
    nodes.push({ name: item.id, value: item.amount ?? 0, label: { formatter: item.label },
      description: item.description, itemStyle: { color: energyUseChartColor(item.colorKey) } });
  }
  return { animation: false, tooltip, series: [{ type: 'sankey', left: 120, right: 180, top: 24, bottom: 24,
    nodeWidth: 14, nodeGap: 16, draggable: false, layoutIterations: 0,
    label: { color: 'var(--v1-text)', width: 150, overflow: 'truncate' },
    lineStyle: { color: 'source', opacity: .35, curveness: .5 }, emphasis: { focus: 'adjacency' },
    data: nodes, links: links.map(link => ({ ...link,
      description: `${link.source.slice(7)} → ${targets.find(item => item.id === link.target)?.label}\n${number(link.value)} ${unit}\nFY ${year}${partial ? '\nPartial coverage · known values only' : ''}` })) }] };
}

/** Reserve space for the plain legend's wrapped rows, including multiline names. */
export function energyUseComparisonLegendHeight(result: EnergyUseAnnualResult | undefined, width: number): number {
  if (!result?.items.length) return 0;
  const columns = Math.max(1, Math.floor((width - 48) / 224));
  let height = 0;
  for (let index = 0; index < result.items.length; index += columns) {
    const lines = Math.max(...result.items.slice(index, index + columns).map(row =>
      Math.max(1, Math.ceil(row.projection.item.name.length * 7 / 180))));
    height += lines * 16 + 12;
  }
  return height + 12;
}

export function energyUseComparisonOption(results: readonly EnergyUseAnnualResult[], unit: string, history: boolean, legendHeight = energyUseComparisonLegendHeight(results[0], 600)): V1EChartsOption {
  if (!results.length) return { series: [] };
  if (!history) {
    const rows = [...results[0].items].sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1) || a.projection.item.guid.localeCompare(b.projection.item.guid));
    const valueLabel = (value: number | null) => value === null ? 'Unavailable' : `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${unit}/yr`;
    const labelSpace = rows.reduce((space, row) => Math.max(space, valueLabel(row.amount).length * 7 + 24), 120);
    return { animation: false, tooltip, grid: { left: 160, right: labelSpace, top: 24, bottom: 60 },
      xAxis: { type: 'value', name: `${unit}/yr`, min: 0 },
      yAxis: { type: 'category', inverse: true, data: rows.map(row => row.projection.item.name), axisLabel: { width: 140, overflow: 'truncate' } },
      series: [{ type: 'bar', label: { show: true, position: 'right', distance: 8, color: 'var(--v1-text)', formatter: params => {
        const data = params.data as { value: number | null };
        return valueLabel(data.value);
      } }, data: rows.map(row => ({ value: row.amount,
        itemStyle: { color: energyUseChartColor(row.projection.item.guid) },
        description: `${row.projection.item.name}\n${row.amount === null ? 'Unavailable' : number(row.amount) + ' ' + unit}\n${row.percent === null ? 'Share unavailable' : percent(row.percent) + '% of Group Usage'}${coverageNote(row)}` })) }] };
  }
  return { animation: false, tooltip, grid: { left: 80, right: 24, top: 24, bottom: legendHeight + 60 },
    legend: { type: 'plain', bottom: 0, left: 24, right: 24, itemGap: 12,
      textStyle: { color: 'var(--v1-text)', fontSize: 12, width: 180, overflow: 'break', lineHeight: 16 } },
    xAxis: { type: 'category', name: 'Fiscal year', data: results.map(row => String(row.year)) }, yAxis: { type: 'value', name: unit, min: 0 },
    series: results[0].items.map(item => ({ type: 'bar', name: item.projection.item.name, id: item.projection.item.guid, stack: 'group',
      itemStyle: { color: energyUseChartColor(item.projection.item.guid) },
      data: results.map(result => {
        const row = result.items.find(row => row.projection.item.guid === item.projection.item.guid);
        return { value: row?.amount ?? null,
          description: `${item.projection.item.name} · FY ${result.year}\n${row?.amount == null ? 'Unavailable' : number(row.amount) + ' ' + unit}${row ? coverageNote(row) : ''}${result.partial ? '\nGroup total has partial coverage' : ''}` };
      }) })) };
}
