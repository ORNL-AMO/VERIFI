import type { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import type { MonthlyPatternsModel } from './monthly-patterns.presenter';
import { observationText } from '../time-series/time-series-options';

export function monthlyPatternsOption(model: MonthlyPatternsModel): V1EChartsOption {
  const combined = model.panels.length > 1;
  return {
    animation: false,
    legend: { show: model.legend, type: 'scroll', top: 0, left: 0, right: 0, data: model.years.map(year => String(year.year)),
      selected: Object.fromEntries(model.years.map(year => [String(year.year), year.visible])),
      formatter: (name: string) => model.years.find(year => String(year.year) === name)?.label ?? name },
    axisPointer: combined ? { link: [{ xAxisIndex: 'all' }] } : undefined,
    grid: model.panels.map((_, index) => combined ? index === 0 ? { top: 64, bottom: '55%', left: 82, right: 28 } : { top: '57%', bottom: 46, left: 82, right: 28 } : { top: 64, bottom: 46, left: 82, right: 28 }),
    xAxis: model.panels.map((_, index) => ({ type: 'category', gridIndex: index, data: [...model.months], boundaryGap: false,
      axisLabel: { show: index === model.panels.length - 1 }, axisTick: { show: index === model.panels.length - 1 } })),
    yAxis: model.panels.map((panel, index) => ({ type: 'value', gridIndex: index, min: panel.allowNegative ? undefined : 0, name: panel.unit ? `${panel.label} (${panel.unit})` : panel.label, nameLocation: 'middle', nameGap: 62,
      axisLabel: panel.currency ? { formatter: '${value}' } : {} })),
    tooltip: { trigger: 'axis', renderMode: 'richText', confine: true, formatter: (value: unknown) => {
      const params = (Array.isArray(value) ? value : [value]) as { seriesId?: string; dataIndex?: number }[];
      return params.flatMap(param => {
        for (const panel of model.panels) for (const year of panel.years) if (`${panel.id}:${year.year}` === param.seriesId) {
          const point = year.points[param.dataIndex ?? -1], label = model.years.find(item => item.year === year.year)?.label;
          return point ? [`${label}: ${observationText(point, panel.unit)} (${point.start} – ${point.end})`] : [];
        }
        return [];
      }).join('\n');
    } },
    series: model.panels.flatMap((panel, index) => panel.years.map(year => {
      const style = model.years.find(item => item.year === year.year)!;
      return { id: `${panel.id}:${year.year}`, name: String(year.year), type: 'line', xAxisIndex: index, yAxisIndex: index,
        data: year.points.map(point => point.observation.state === 'observed' ? point.observation.value : null), connectNulls: false,
        smooth: model.smoothLines, showSymbol: true, symbolSize: 7, itemStyle: { color: style.color },
        lineStyle: { color: style.color, width: 2.5, type: style.lineStyle ?? 'solid' }, emphasis: { focus: 'series' } };
    }))
  } as V1EChartsOption;
}
