import { FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';
import { formatNumber } from '@angular/common';

function electricityValues(rate: { CO2: number; CH4: number; N2O: number }): readonly string[] {
  return [rate.CO2, rate.CH4, rate.N2O].map(value => value == null ? ''
    : Number.isFinite(value) ? formatNumber(value, 'en-US', '1.0-3') : '—');
}

/** Retain the legacy report's raw fuel numbers, gram labels, and zero-as-dash convention. */
function fuelFactor(value: number | undefined, gas: string, unit: string): string {
  return value ? `${value} g ${gas}/${unit ?? ''}` : '—';
}
export function emissionFactorsTableView(result: FacilityEmissionFactorsResult) {
  return {
    ...result, electricityMeterNames: result.electricityMeters.map(meter => meter.name).join(', '),
    electricity: result.electricity.map(row => ({ ...row, marketValues: electricityValues(row.marketRate), locationValues: electricityValues(row.locationRate) })),
    other: result.other.map(row => ({ ...row, fuel: row.fuelValue || '—',
      co2: fuelFactor(row.CO2, 'CO₂', row.unit), ch4: fuelFactor(row.CH4, 'CH₄', row.unit), n2o: fuelFactor(row.N2O, 'N₂O', row.unit) }))
  };
}
