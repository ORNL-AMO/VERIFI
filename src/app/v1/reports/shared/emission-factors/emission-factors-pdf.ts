import { FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';
import { ReportSection } from '@shared/report-output/report-section.model';
import { emissionFactorsTableView } from './emission-factors-table.view';

/** The shared writer's Helvetica font uses plain chemical labels instead of Unicode subscripts. */
export function emissionFactorsPdfText(value: string): string {
  return value.replace(/[₀-₉]/g, digit => String(digit.charCodeAt(0) - 0x2080)).replace(/[–—−]/g, '-');
}

export function emissionFactorsPdfSections(result: FacilityEmissionFactorsResult, bookmarkLevel = 0): ReportSection[] {
  const view = emissionFactorsTableView(result), sections: ReportSection[] = [];
  if (view.electricity.length) {
    sections.push({ type: 'heading', title: 'Electricity Emission Factors', tocInclude: true, tocLabel: 'Electricity Emission Factors', bookmarkLevel },
      { type: 'text', content: `Zip Code: ${view.facility.zip ?? ''} | eGRID Region: ${view.facility.eGridSubregion ?? ''}\nElectricity Meters: ${emissionFactorsPdfText(view.electricityMeterNames)}` },
      { type: 'table', headers: [{ content: 'Year', rowSpan: 2 }, { content: 'Market Emission Rates', colSpan: 3 }, { content: 'Location Emission Rates', colSpan: 3 }],
        subHeaders: ['CO2 (kg CO2/MWh)', 'CH4 (g CH4/MWh)', 'N2O (g N2O/MWh)', 'CO2 (kg CO2/MWh)', 'CH4 (g CH4/MWh)', 'N2O (g N2O/MWh)'],
        rows: view.electricity.map(row => [String(row.year), ...row.marketValues.map(emissionFactorsPdfText), ...row.locationValues.map(emissionFactorsPdfText)]) });
  }
  if (view.other.length) {
    sections.push({ type: 'heading', title: 'Other Emission Factors', pageBreakBefore: !!view.electricity.length,
      tocInclude: true, tocLabel: 'Other Emission Factors', bookmarkLevel },
    { type: 'table', headers: ['Meter', 'Source', 'Fuel Type', 'CO2 Factor', 'CH4 Factor', 'N2O Factor'],
      rows: view.other.map(row => [emissionFactorsPdfText(row.meterName + (row.unavailable ? `\n${row.unavailable}` : '')),
        row.source, emissionFactorsPdfText(row.fuel), emissionFactorsPdfText(row.co2), emissionFactorsPdfText(row.ch4), emissionFactorsPdfText(row.n2o)]) });
  }
  return sections;
}
