import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import {
  accountAnalysisResultsFingerprint,
  buildAccountAnalysisResultsRequest
} from './account-analysis-results-request';

describe('account analysis results request', () => {
  const analysis = {
    guid: 'account-analysis-a', name: 'Portfolio A', analysisCategory: 'energy', baselineYear: 2022,
    energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
    facilityAnalysisItems: [
      { facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' },
      { facilityId: 'facility-b', analysisItemId: 'skip' }
    ]
  } as IdbAccountAnalysisItem;
  const snapshot = {
    account: { guid: 'account-a', name: 'Account A', fiscalYear: 'calendarYear', assessmentReportVersion: 'AR6' },
    facilities: [
      { guid: 'facility-a', name: 'Facility A', accountId: 'account-a', fiscalYear: 'calendarYear' },
      { guid: 'facility-b', name: 'Facility B', accountId: 'account-a', fiscalYear: 'calendarYear' }
    ],
    facilityAnalyses: [{
      guid: 'facility-analysis-a', name: 'Facility A analysis', accountId: 'account-a', facilityId: 'facility-a',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2022,
      hasBanking: true, bankedAnalysisItemId: 'banked-a', groups: [{
        idbGroupId: 'group-a', predictorVariables: [{ id: 'predictor-a' }], selectedModelId: 'model-a', models: [{
          modelId: 'model-a', predictorVariables: [{ id: 'model-predictor-a' }]
        }]
      }]
    }, {
      guid: 'banked-a', name: 'Banked source', accountId: 'account-a', facilityId: 'facility-a',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2021,
      hasBanking: false, groups: [{ idbGroupId: 'banked-group-a', predictorVariables: [] }]
    }, {
      guid: 'facility-analysis-b', name: 'Facility B analysis', accountId: 'account-a', facilityId: 'facility-b',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2022,
      hasBanking: false, groups: [{ idbGroupId: 'group-b', predictorVariables: [{ id: 'predictor-b' }] }]
    }],
    meters: [
      { guid: 'meter-a', facilityId: 'facility-a', groupId: 'group-a', name: 'Selected meter' },
      { guid: 'banked-meter-a', facilityId: 'facility-a', groupId: 'banked-group-a', name: 'Banked meter' },
      { guid: 'other-group-meter-a', facilityId: 'facility-a', groupId: 'other-group', name: 'Other group' },
      { guid: 'meter-b', facilityId: 'facility-b', groupId: 'group-b', name: 'Skipped meter' }
    ],
    meterData: [
      { guid: 'reading-a', meterId: 'meter-a', facilityId: 'facility-a', totalEnergyUse: 10 },
      { guid: 'banked-reading-a', meterId: 'banked-meter-a', facilityId: 'facility-a', totalEnergyUse: 20 },
      { guid: 'other-reading-a', meterId: 'other-group-meter-a', facilityId: 'facility-a', totalEnergyUse: 30 },
      { guid: 'reading-b', meterId: 'meter-b', facilityId: 'facility-b', totalEnergyUse: 40 }
    ],
    meterGroups: [],
    predictors: [
      { guid: 'predictor-a', facilityId: 'facility-a', name: 'Selected predictor' },
      { guid: 'model-predictor-a', facilityId: 'facility-a', name: 'Selected model predictor' },
      { guid: 'unused-predictor-a', facilityId: 'facility-a', name: 'Unused predictor' },
      { guid: 'predictor-b', facilityId: 'facility-b', name: 'Skipped predictor' }
    ],
    predictorData: [
      { guid: 'predictor-reading-a', facilityId: 'facility-a', predictorId: 'predictor-a', amount: 1 },
      { guid: 'model-predictor-reading-a', facilityId: 'facility-a', predictorId: 'model-predictor-a', amount: 2 },
      { guid: 'unused-predictor-reading-a', facilityId: 'facility-a', predictorId: 'unused-predictor-a', amount: 3 },
      { guid: 'predictor-reading-b', facilityId: 'facility-b', predictorId: 'predictor-b', amount: 4 }
    ], accountAnalyses: [analysis],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot;

  it('includes selected facility analyses and their banking dependencies', () => {
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    expect(request.allAccountAnalysisItems.map(item => item.guid)).toEqual(['facility-analysis-a', 'banked-a']);
    expect(request.accountFacilities.map(item => item.guid)).toEqual(['facility-a']);
    expect(request.meters.map(item => item.guid)).toEqual(['meter-a', 'banked-meter-a']);
    expect(request.meterData.map(item => item.guid)).toEqual(['reading-a', 'banked-reading-a']);
    expect(request.accountPredictors.map(item => item.guid)).toEqual(['predictor-a', 'model-predictor-a']);
    expect(request.accountPredictorEntries.map(item => item.guid))
      .toEqual(['predictor-reading-a', 'model-predictor-reading-a']);
  });

  it('ignores display-only names but changes for calculation-bearing setup', () => {
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    const renamed = structuredClone(request);
    renamed.accountAnalysisItem.name = 'Renamed portfolio';
    renamed.account.name = 'Renamed account';
    renamed.accountFacilities[0].name = 'Renamed facility';
    expect(accountAnalysisResultsFingerprint(renamed)).toBe(accountAnalysisResultsFingerprint(request));

    const changed = structuredClone(request);
    changed.accountAnalysisItem.baselineYear = 2023;
    expect(accountAnalysisResultsFingerprint(changed)).not.toBe(accountAnalysisResultsFingerprint(request));
  });

  it('changes when a calculation predictor identity changes', () => {
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    request.allAccountAnalysisItems[0].groups = [{
      idbGroupId: 'group-a',
      predictorVariables: [{
        id: 'predictor-a', name: 'Weather', production: false,
        productionInAnalysis: false, regressionCoefficient: 2, unit: 'F'
      }]
    } as any];
    const changed = structuredClone(request);
    changed.allAccountAnalysisItems[0].groups[0].predictorVariables[0].id = 'predictor-b';

    expect(accountAnalysisResultsFingerprint(changed)).not.toBe(accountAnalysisResultsFingerprint(request));
  });

  it('ignores unrelated and skipped-facility inputs but changes for selected readings', () => {
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    const unrelatedSnapshot = structuredClone(snapshot) as any;
    unrelatedSnapshot.facilities[1].name = 'Renamed skipped facility';
    unrelatedSnapshot.meterData.find(item => item.guid === 'reading-b')!.totalEnergyUse = 999;
    unrelatedSnapshot.predictorData.find(item => item.guid === 'predictor-reading-b')!.amount = 999;
    unrelatedSnapshot.meterData.find(item => item.guid === 'other-reading-a')!.totalEnergyUse = 999;

    expect(accountAnalysisResultsFingerprint(buildAccountAnalysisResultsRequest(analysis, unrelatedSnapshot)))
      .toBe(accountAnalysisResultsFingerprint(request));

    const selectedSnapshot = structuredClone(snapshot) as any;
    selectedSnapshot.meterData.find(item => item.guid === 'reading-a')!.totalEnergyUse = 999;
    expect(accountAnalysisResultsFingerprint(buildAccountAnalysisResultsRequest(analysis, selectedSnapshot)))
      .not.toBe(accountAnalysisResultsFingerprint(request));
  });
});
