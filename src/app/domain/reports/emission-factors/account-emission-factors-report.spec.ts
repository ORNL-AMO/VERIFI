import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { getAccountReportErrors } from '@domain/calculations/status-check-calculations/validation/accountReportValidation';
import { emissionFactorsRates, emissionFactorsSnapshot } from '../testing/emission-factors-fixtures';
import { buildAccountEmissionFactorsInputs, calculateEmissionFactors } from './emission-factors-report';

describe('account emission-factor composition and validation', () => {
  it('preserves owned facility order, isolates meters, retains empty facilities, and detaches inputs', () => {
    const snapshot = emissionFactorsSnapshot();
    snapshot.facilities.push({ ...snapshot.facilities[0], guid: 'empty' }, { ...snapshot.facilities[0], guid: 'foreign', accountId: 'elsewhere' });
    snapshot.meters.push({ ...snapshot.meters[0], guid: 'foreign-meter', accountId: 'elsewhere' });
    const before = structuredClone(snapshot);
    const inputs = buildAccountEmissionFactorsInputs(snapshot, { startYear: 2022, endYear: 2024 }, emissionFactorsRates());
    expect(inputs.map(input => input.facility.guid)).toEqual(['facility', 'empty']);
    const results = inputs.map(calculateEmissionFactors);
    expect(results[0].electricityMeters.map(meter => meter.guid)).toEqual(['meter']);
    expect(results[1].electricity).toEqual([]); expect(results[1].other).toEqual([]);
    inputs[0].facility.name = 'Detached'; expect(snapshot).toEqual(before);
  });
  it.each([undefined, null, NaN, Infinity, 2022.5, 1799, 10000, '2022'])('flags unsupported or absent year %s without requiring months', year => {
    const snapshot = emissionFactorsSnapshot();
    const report = { ...getNewIdbAccountReport(snapshot.account, snapshot.facilities, []), reportType: 'accountEmissionFactors' as const,
      startYear: year as number, endYear: 2024 };
    expect(getAccountReportErrors(report, [])).toMatchObject({ hasErrors: true, missingStartDate: true, invalidDateRange: true });
    expect(() => buildAccountEmissionFactorsInputs(snapshot, report, [])).toThrow('earlier');
    report.startYear = 2022;
    expect(getAccountReportErrors(report, []).hasErrors).toBe(false);
  });
  it.each([[2024, 2024], [2025, 2024]])('rejects equal/reversed periods even for an empty account', (startYear, endYear) => {
    const snapshot = emissionFactorsSnapshot(); snapshot.facilities = [];
    expect(() => buildAccountEmissionFactorsInputs(snapshot, { startYear, endYear }, [])).toThrow('earlier');
  });
});
