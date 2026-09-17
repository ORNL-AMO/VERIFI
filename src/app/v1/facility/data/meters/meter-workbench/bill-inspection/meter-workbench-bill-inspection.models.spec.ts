import { meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { buildBillInspectionReport } from './meter-workbench-bill-inspection.models';

describe('Bill Inspection report model', () => {
  it('builds raw-reading correlations against consumption, total cost, billed demand, and real demand', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', startingUnit: 'CCF', energyUnit: 'MMBtu', demandUnit: 'kW', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          month: 1,
          totalEnergyUse: 100,
          totalCost: 120,
          totalBilledDemand: 40,
          totalRealDemand: 30,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 40 }]
        }),
        reading({
          guid: 'reading-b',
          month: 2,
          totalEnergyUse: 110,
          totalCost: 130,
          totalRealDemand: 35,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 25, chargeUsage: 35 }]
        }),
        reading({
          guid: 'reading-c',
          month: 3,
          totalEnergyUse: 120,
          totalCost: 140,
          totalBilledDemand: 45,
          totalRealDemand: 38,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 30, chargeUsage: 45 }]
        })
      ]
    );

    const plots = report.charges[0].plots;
    const consumptionPlot = plots.find(plot => plot.metric === 'consumption');
    const totalCostPlot = plots.find(plot => plot.metric === 'totalCost');
    const demandPlot = plots.find(plot => plot.metric === 'demand');

    expect(consumptionPlot?.points.map(point => [point.x, point.y, point.chargeUsage])).toEqual([
      [100, 20, 40],
      [110, 25, 35],
      [120, 30, 45]
    ]);
    expect(consumptionPlot?.xLabel).toBe('Total Consumption (MMBtu)');
    expect(consumptionPlot?.xUnit).toBe('MMBtu');
    expect(consumptionPlot?.points.map(point => point.readingGuid)).toEqual(['reading-a', 'reading-b', 'reading-c']);
    expect(totalCostPlot?.points.map(point => [point.x, point.y, point.xLabel, point.yLabel])).toEqual([
      [120, 20, '$120', '$20'],
      [130, 25, '$130', '$25'],
      [140, 30, '$140', '$30']
    ]);
    expect(demandPlot?.points.map(point => [point.x, point.y, point.demandKind])).toEqual([
      [40, 20, 'Billed Demand'],
      [35, 25, 'Real Demand'],
      [45, 30, 'Billed Demand']
    ]);
  });

  it('omits missing and non-finite charge pairs from correlation points', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          month: 1,
          totalEnergyUse: 100,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 40 }]
        }),
        reading({
          guid: 'reading-b',
          month: 2,
          totalEnergyUse: Number.NaN,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 25, chargeUsage: 35 }]
        }),
        reading({
          guid: 'reading-c',
          month: 3,
          totalEnergyUse: 120,
          charges: []
        })
      ]
    );

    const consumptionPlot = report.charges[0].plots.find(plot => plot.metric === 'consumption');

    expect(consumptionPlot?.points.map(point => [point.x, point.y])).toEqual([[100, 20]]);
  });

  it('builds regression only when enough paired readings are available', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const threePointReport = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({ guid: 'reading-a', month: 1, totalEnergyUse: 10, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 0 }] }),
        reading({ guid: 'reading-b', month: 2, totalEnergyUse: 20, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 40, chargeUsage: 0 }] }),
        reading({ guid: 'reading-c', month: 3, totalEnergyUse: 30, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 60, chargeUsage: 0 }] })
      ]
    );
    const twoPointReport = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({ guid: 'reading-a', month: 1, totalEnergyUse: 10, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 0 }] }),
        reading({ guid: 'reading-b', month: 2, totalEnergyUse: 20, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 40, chargeUsage: 0 }] })
      ]
    );

    const threePointPlot = threePointReport.charges[0].plots.find(plot => plot.metric === 'consumption');
    const twoPointPlot = twoPointReport.charges[0].plots.find(plot => plot.metric === 'consumption');

    expect(threePointPlot?.regression?.rSquared).toBeCloseTo(1);
    expect(twoPointPlot?.regression).toBeUndefined();
  });
});

function charge(guid: string, name: string, chargeType: 'demand' | 'other') {
  return {
    guid,
    name,
    chargeType,
    displayUsageInTable: true,
    displayChargeInTable: true
  };
}
