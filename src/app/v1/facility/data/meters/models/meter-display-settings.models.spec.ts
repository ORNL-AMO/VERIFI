import { facility, meter } from '../facility-meters.testing';
import { resolveMeterDisplaySettings } from './meter-display-settings.models';

describe('resolveMeterDisplaySettings', () => {
  it('inherits facility unit and basis until the meter has explicit overrides', () => {
    const facilityValue = facility({ energyUnit: 'GJ', energyIsSource: true });

    expect(resolveMeterDisplaySettings(meter({ source: 'Electricity' }), facilityValue)).toEqual(expect.objectContaining({
      energyUnit: 'GJ', energyIsSource: true, inheritsEnergyUnit: true, inheritsEnergyIsSource: true
    }));
    expect(resolveMeterDisplaySettings(meter({
      source: 'Electricity', displayEnergyUnit: 'kWh', displayEnergyIsSource: false
    }), facilityValue)).toEqual(expect.objectContaining({
      energyUnit: 'kWh', energyIsSource: false, inheritsEnergyUnit: false, inheritsEnergyIsSource: false
    }));
  });

  it.each([
    { label: 'unsupported source', overrides: { source: 'Water Intake' as const, siteToSource: 3 } },
    { label: 'excluded energy', overrides: { source: 'Electricity' as const, includeInEnergy: false, siteToSource: 3 } },
    { label: 'scope two', overrides: { source: 'Other Fuels' as const, scope: 2, siteToSource: 3 } },
    { label: 'missing factor', overrides: { source: 'Electricity' as const, siteToSource: undefined } },
    { label: 'unchanged factor', overrides: { source: 'Electricity' as const, siteToSource: 1 } }
  ])('hides site/source for $label', ({ overrides }) => {
    expect(resolveMeterDisplaySettings(meter(overrides), facility()).showSiteToSource).toBe(false);
  });

  it('shows site/source when the domain rule applies and the factor changes values', () => {
    expect(resolveMeterDisplaySettings(meter({ source: 'Natural Gas', siteToSource: 1.05 }), facility()).showSiteToSource).toBe(true);
  });
});
