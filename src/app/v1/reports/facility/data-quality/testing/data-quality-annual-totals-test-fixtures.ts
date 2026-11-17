import { SubregionEmissions } from '@data/models/eGridEmissions';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';
import { dataQualitySnapshot } from './data-quality-report-test-fixtures';

export const ANNUAL_TEST_EMISSIONS: SubregionEmissions[] = [{
  subregion: 'CAMX',
  locationEmissionRates: [2023, 2024].map(year => ({ year, CO2: 400, CH4: .01, N2O: .005 })),
  residualEmissionRates: [2023, 2024].map(year => ({ year, CO2: 500, CH4: .02, N2O: .01 }))
}];

/** Two calendar years within a fiscal/source-energy facility, with annual-only report content. */
export function annualTotalsSnapshot() {
  const snapshot = dataQualitySnapshot();
  snapshot.account.displayEmissions = true;
  Object.assign(snapshot.facilities[0], {
    eGridSubregion: 'CAMX', energyUnit: 'MMBtu', electricityUnit: 'kWh', energyIsSource: true,
    fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true
  });
  for (const meter of snapshot.meters) Object.assign(meter, {
    startingUnit: 'kWh', energyUnit: 'kWh', siteToSource: 3, meterReadingDataApplication: 'fullMonth'
  });
  const settings = snapshot.facilityReports[0].dataQualityReportSettings;
  for (const flag of [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS]) settings[flag] = false;
  Object.assign(settings, {
    includeMeter: false, includePredictors: false, includeAnnualTotalsTable: true,
    selectedMeterIds: ['meter-a'], selectedPredictorIds: []
  });
  const periods = [
    { year: 2023, month: 1 }, { year: 2023, month: 12 },
    { year: 2024, month: 1 }, { year: 2024, month: 12 }
  ];
  return {
    ...snapshot,
    meterData: snapshot.meters.flatMap((meter, meterIndex) => periods.map((period, index) => ({
      ...getNewIdbUtilityMeterData(meter, []), ...period,
      id: 100 + meterIndex * periods.length + index, guid: `${meter.guid}-annual-${index}`,
      day: 1, migratedDates: true, totalEnergyUse: (index + 1) * 100,
      totalVolume: (index + 1) * 100, totalCost: (index + 1) * 10
    })))
  };
}
