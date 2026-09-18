import { meter } from '../facility-meters.testing';
import { METER_CALENDARIZATION_METHODS, meterCalendarizationMethodLabel } from './meter-configuration.models';
import {
  buildMeterWorkbenchTabAttention,
  METER_WORKBENCH_TABS,
  meterWorkbenchTabsForMeter,
  shouldShowMeterBillInspectionTab
} from './meter-workbench.models';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';

describe('meter workbench models', () => {
  it('labels calendarization methods and hides monthly data only for do-not-calendarize meters', () => {
    expect(METER_CALENDARIZATION_METHODS).toHaveLength(3);
    expect(meterCalendarizationMethodLabel(undefined)).toBe('Select a calendarization method');
    expect(meterCalendarizationMethodLabel('fullMonth')).toBe('Do Not Calendarize Meter Data');

    expect(meterWorkbenchTabsForMeter(meter({ meterReadingDataApplication: 'fullMonth' })).map(tab => tab.id)).not.toContain('monthly');
    expect(meterWorkbenchTabsForMeter(meter({ meterReadingDataApplication: 'fullMonth' })).map(tab => tab.id)).toContain('monthly-chart');
    expect(meterWorkbenchTabsForMeter(meter({ meterReadingDataApplication: 'backward' })).map(tab => tab.id)).toContain('monthly');
    expect(meterWorkbenchTabsForMeter(meter({ meterReadingDataApplication: undefined })).map(tab => tab.id)).toContain('monthly');
  });

  it('shows bill inspection only for electricity meters with configured charges', () => {
    const charge = { guid: 'charge-a', name: 'Demand Charge', chargeType: 'demand' as const, displayUsageInTable: true, displayChargeInTable: true };

    expect(shouldShowMeterBillInspectionTab(meter({ source: 'Electricity', charges: [charge] }))).toBe(true);
    expect(shouldShowMeterBillInspectionTab(meter({ source: 'Electricity', charges: [] }))).toBe(false);
    expect(shouldShowMeterBillInspectionTab(meter({ source: 'Natural Gas', charges: [charge] }))).toBe(false);
    expect(meterWorkbenchTabsForMeter(meter({ source: 'Electricity', charges: [charge] })).map(tab => tab.id)).toContain('bill-inspection');
    expect(meterWorkbenchTabsForMeter(meter({ source: 'Electricity', charges: [] })).map(tab => tab.id)).not.toContain('bill-inspection');
  });

  it('places Bill Inspection before Quality Report with the monocle icon', () => {
    const tabIds = METER_WORKBENCH_TABS.map(tab => tab.id);
    const billInspection = METER_WORKBENCH_TABS.find(tab => tab.id === 'bill-inspection');

    expect(tabIds.slice(-2)).toEqual(['bill-inspection', 'quality']);
    expect(billInspection?.icon).toBe('monocle');
  });

  it('groups active finding counts by their workbench destination', () => {
    const entity = { kind: 'meter' as const, guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    const findings = presentFindings([
      makeFinding('meter.configuration.invalid', 'error', 'configuration', entity, { fields: ['name'] }),
      makeFinding('meter.calendarization.missing', 'warning', 'configuration', entity),
      makeFinding('meter.currency.stale', 'warning', 'currency', entity, { latestPeriod: '2026-01', thresholdMonths: 3 }),
      makeFinding('meter.quality.cost-outlier', 'warning', 'quality', entity, { count: 2 })
    ]);

    expect(buildMeterWorkbenchTabAttention(findings)).toEqual({
      settings: { total: 2, errorCount: 1, warningCount: 1, state: 'error' },
      readings: { total: 1, errorCount: 0, warningCount: 1, state: 'warning' },
      quality: { total: 1, errorCount: 0, warningCount: 1, state: 'warning' }
    });
  });
});
