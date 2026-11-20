import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { getNewAccountCustomFuel } from '@data/models/idbModels/customFuel';
import { SubregionEmissions } from '@data/models/eGridEmissions';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { analysisReportFixture } from './analysis-report-fixtures';

export function emissionFactorsSnapshot() {
  const snapshot = analysisReportFixture();
  const account = { ...snapshot.account, displayEmissions: true };
  const facilities = [{ ...snapshot.facilities[0], eGridSubregion: 'TEST', zip: '37830' }];
  const meter: IdbUtilityMeter = { ...snapshot.meters[0], source: 'Electricity', name: 'Purchased electricity' };
  const meters: IdbUtilityMeter[] = [meter, { ...meter, id: 6, guid: 'gas', name: 'Natural gas', source: 'Natural Gas', energyUnit: 'MMBtu' }];
  const facilityReports = [{ ...getNewIdbFacilityReport('facility', 'account', 'emissionFactors', []), id: 80,
    guid: 'report-a', name: 'Emission factors', emissionFactorsReportSettings: { startYear: 2022, endYear: 2024 } }];
  const customFuels = [
    { ...getNewAccountCustomFuel(account), guid: 'road-fuel', value: 'Custom road', isMobile: true, isOnRoad: true, CO2: 2, CH4: 3, N2O: 4 },
    { ...getNewAccountCustomFuel(account), guid: 'offroad-fuel', value: 'Custom offroad', isMobile: true, isOnRoad: false, CO2: 5, CH4: 6, N2O: 7 }
  ];
  return { ...snapshot, account, facilities, meters, facilityReports, customFuels, customEmissions: [...snapshot.customEmissions], accountReports: [] };
}
export function emissionFactorsRates(): SubregionEmissions[] {
  return [{ subregion: 'TEST', locationEmissionRates: [
    { year: 2020, CO2: 100.123456, CH4: .1, N2O: .01 }, { year: 2024, CO2: 200, CH4: .2, N2O: .02 }
  ], residualEmissionRates: [{ year: 2021, CO2: 300, CH4: .3, N2O: .03 }] }];
}
