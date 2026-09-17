import { TestBed } from '@angular/core/testing';
import { IdbFacility } from '@data/models/idbModels/facility';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { account, facility, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MeterReadingsTableService } from './meter-readings-table.service';

describe('MeterReadingsTableService', () => {
  let service: MeterReadingsTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MeterReadingsTableService,
        { provide: EGridService, useValue: { co2Emissions: [] } }
      ]
    });
    service = TestBed.inject(MeterReadingsTableService);
  });

  it('builds an unfiltered electricity readings table without mutating source readings', () => {
    const sourceReading = reading({ guid: 'reading-feb', month: 2, totalEnergyUse: 20, isEstimated: true });
    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: facility(),
      meter: meter({ guid: 'meter-a', source: 'Electricity', energyUnit: 'kWh' }),
      readings: [
        sourceReading,
        reading({ guid: 'reading-jan', month: 1, totalEnergyUse: 10 })
      ],
      customFuels: [],
      customGWPs: []
    });

    expect(view.type).toBe('electricity');
    expect(view.rows.map(row => row.reading.guid)).toEqual(['reading-feb', 'reading-jan']);
    expect(view.columns.map(column => column.id)).toContain('totalEnergyUse');
    expect(view.hasEstimatedReadings).toBe(true);
    expect(sourceReading.totalWithMarketEmissions).toBeUndefined();
  });

  it('uses saved facility column preferences without filtering estimated readings', () => {
    const selectedFacility = facility({
      tableElectricityFilters: {
        generalInformationFilters: {
          showSection: true,
          totalCost: false,
          realDemand: false,
          billedDemand: true,
          powerFactor: false
        },
        emissionsFilters: {
          showSection: false,
          marketEmissions: false,
          locationEmissions: false,
          recs: false,
          excessRECs: false,
          excessRECsEmissions: false
        }
      }
    } as Partial<IdbFacility>);

    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: selectedFacility,
      meter: meter({ guid: 'meter-a', source: 'Electricity' }),
      readings: [
        reading({ guid: 'metered', isEstimated: false }),
        reading({ guid: 'estimated', isEstimated: true })
      ],
      customFuels: [],
      customGWPs: []
    });

    expect(view.rows.map(row => row.reading.guid)).toEqual(['metered', 'estimated']);
    expect(view.hasEstimatedReadings).toBe(true);
    expect(view.columns.map(column => column.id)).toContain('totalBilledDemand');
    expect(view.columns.map(column => column.id)).not.toContain('totalCost');
  });

  it('adds detailed charge columns from the selected meter display flags', () => {
    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: facility(),
      meter: meter({
        guid: 'meter-a',
        source: 'Electricity',
        charges: [{
          guid: 'charge-a',
          name: 'Demand Charge',
          chargeType: 'demand',
          displayUsageInTable: true,
          displayChargeInTable: true
        }]
      }),
      readings: [reading({
        charges: [{ chargeGuid: 'charge-a', chargeAmount: 12, chargeUsage: 34 }]
      })],
      customFuels: [],
      customGWPs: []
    });

    expect(view.columns.map(column => column.id)).toEqual(expect.arrayContaining(['charge-a:usage', 'charge-a:amount']));
    expect(view.rows[0].values['charge-a:usage']).toBe('34');
    expect(view.rows[0].values['charge-a:amount']).toBe('$12');
  });

  it('uses demand units for demand charge usage columns', () => {
    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: facility(),
      meter: meter({
        guid: 'meter-a',
        source: 'Electricity',
        startingUnit: 'kWh',
        demandUnit: 'kW',
        charges: [{
          guid: 'charge-a',
          name: 'Real Demand',
          chargeType: 'demand',
          displayUsageInTable: true,
          displayChargeInTable: false
        }]
      }),
      readings: [reading({ charges: [{ chargeGuid: 'charge-a', chargeAmount: 12, chargeUsage: 34 }] })],
      customFuels: [],
      customGWPs: []
    });

    expect(view.columns.find(column => column.id === 'charge-a:usage')?.label).toBe('Real Demand (kW)');
  });

  it('displays and sorts electricity energy use as zero when the meter is excluded from energy totals', () => {
    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: facility(),
      meter: meter({
        guid: 'meter-a',
        source: 'Electricity',
        includeInEnergy: false,
        canBeNegative: false
      }),
      readings: [reading({ guid: 'negative-electricity', meterId: 'meter-a', totalEnergyUse: -10 })],
      customFuels: [],
      customGWPs: []
    });

    expect(view.rows[0].values['totalEnergyUse']).toBe('0');
    expect(view.rows[0].sortValues['totalEnergyUse']).toBe(0);
    expect(view.rows[0].hasNegativeReading).toBe(false);
    expect(view.rows[0].negativeColumnIds).toEqual({});
  });

  it('tags negative reading rows and value columns when the meter does not allow negatives', () => {
    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: facility(),
      meter: meter({
        guid: 'meter-a',
        source: 'Natural Gas',
        startingUnit: 'CCF',
        energyUnit: 'MMBtu',
        scope: 1,
        canBeNegative: false
      }),
      readings: [
        reading({ guid: 'negative-volume', meterId: 'meter-a', totalVolume: -5, totalEnergyUse: 10 }),
        reading({ guid: 'negative-energy', meterId: 'meter-a', totalVolume: 5, totalEnergyUse: -10 })
      ],
      customFuels: [],
      customGWPs: []
    });

    expect(view.rows[0].hasNegativeReading).toBe(true);
    expect(view.rows[0].negativeColumnIds).toEqual({ totalVolume: true });
    expect(view.rows[1].hasNegativeReading).toBe(true);
    expect(view.rows[1].negativeColumnIds).toEqual({ totalEnergyUse: true });
  });

  it('does not tag negative readings when the meter allows negatives', () => {
    const view = service.buildTableView({
      account: account({ displayEmissions: false }),
      facility: facility(),
      meter: meter({
        guid: 'meter-a',
        source: 'Electricity',
        canBeNegative: true
      }),
      readings: [reading({ guid: 'allowed-negative', meterId: 'meter-a', totalEnergyUse: -10 })],
      customFuels: [],
      customGWPs: []
    });

    expect(view.rows[0].hasNegativeReading).toBe(false);
    expect(view.rows[0].negativeColumnIds).toEqual({});
  });
});
