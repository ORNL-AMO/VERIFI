import { energyUseFacility, energyUseItem, energyUseSource } from '../../energy-uses.testing';
import { projectEnergyUse } from '../../models/energy-use-projection.models';
import { energyUseHistoryOption } from './energy-use-history.models';
describe('Annual history presentation', () => {
  it('uses one trace per source occurrence, dashed projection segments, and gaps at invalid values', () => {
    const item = energyUseItem({ utilityData: [energyUseSource({ energyUse: [
      { year: 2022, energyUse: 100, energyUseUnit: 'kWh', overrideEnergyUse: true },
      { year: 2024, energyUse: NaN, energyUseUnit: 'kWh', overrideEnergyUse: false }
    ] })] });
    const facility = { ...energyUseFacility(), fiscalYear: 'calendarYear' as const };
    const rows = [2022, 2023, 2024, 2025].map(year => projectEnergyUse(item, facility, year, 'kWh')!);
    const series = energyUseHistoryOption(rows, 'kWh').series as import('echarts/charts').CustomSeriesOption[];
    expect(series).toHaveLength(1);
    expect(series[0].data[1]).toMatchObject({ value: [2023, 100], provenance: { state: 'carried' } });
    expect(series[0].data[2]).toMatchObject({ value: [2024, null] });
    const render = series[0].renderItem as Function;
    const api = { coord: value => value, visual: () => '#000' };
    expect(render({ dataIndex: 1 }, api)).toMatchObject({ children: [{ type: 'line', style: { lineDash: [6, 4] } }, { type: 'polygon' }] });
    expect(render({ dataIndex: 2 }, api)).toBeNull();
  });
});
