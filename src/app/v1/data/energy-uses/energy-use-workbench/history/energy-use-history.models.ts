import { CustomSeriesOption } from 'echarts/charts';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { ProjectedEnergyUse, ProjectedConsumption } from '../../models/energy-use-projection.models';

export function energyUseHistoryOption(rows: readonly ProjectedEnergyUse[], unit: string): V1EChartsOption {
  const sources = rows[0]?.sources ?? [];
  const series: CustomSeriesOption[] = sources.map((source, index) => {
    const points = rows.map(row => row.sources[index]);
    const color = `var(--v1-chart-series-${index % 12 + 1})`;
    return { type: 'custom', name: `${source.source} (${source.sourceIndex + 1})`, color,
      dimensions: ['year', 'consumption'], encode: { x: 0, y: 1 },
      data: points.map(point => ({ value: [point.year, point.amount], provenance: point })),
      renderItem: (params, api) => {
        const current = points[params.dataIndex], previous = points[params.dataIndex - 1];
        if (current.amount === null) return null;
        const [x, y] = api.coord([current.year, current.amount]);
        const stroke = api.visual('color') as string;
        const segment = previous?.amount !== null && previous?.amount !== undefined ? [{ type: 'line' as const,
          shape: { x1: api.coord([previous.year, previous.amount])[0], y1: api.coord([previous.year, previous.amount])[1], x2: x, y2: y },
          style: { stroke, lineWidth: 2, lineDash: current.state === 'carried' ? [6, 4] : undefined }
        }] : [];
        const symbol = current.state === 'carried' ? { type: 'polygon' as const,
          shape: { points: [[x, y - 5], [x + 5, y], [x, y + 5], [x - 5, y]] }, style: { fill: stroke } }
          : { type: 'circle' as const, shape: { cx: x, cy: y, r: 4 }, style: { fill: stroke } };
        return { type: 'group', children: [...segment, symbol] };
      }
    };
  });
  return { animation: false, legend: { type: 'scroll', bottom: 0 }, grid: { left: 70, right: 24, top: 30, bottom: 80 },
    xAxis: { type: 'value', min: rows[0]?.sources[0]?.year, max: rows.at(-1)?.sources[0]?.year, minInterval: 1, axisLabel: { formatter: value => String(value) }, name: 'Fiscal year' },
    yAxis: { type: 'value', name: unit, min: 0 }, tooltip: { trigger: 'item', renderMode: 'richText', formatter: params => {
      const point = (Array.isArray(params) ? params[0] : params).data as { provenance?: ProjectedConsumption };
      const row = point?.provenance;
      return row ? `${row.source} · FY ${row.year}\n${row.amount?.toLocaleString() ?? 'Unavailable'} ${row.unit}\n${row.description}` : '';
    } }, series };
}
