import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { StatusItem } from '@app/v1/status/status.models';
import {
  analysisTypeLabel,
  buildFacilitySelectionItems,
  eligibleFacilityAnalysisCandidates,
  facilityAnalysisBaselineForAccount,
  facilityAnalysisDataThrough,
  facilityAnalysisEligible,
  reconcileFacilityAnalysisLinks
} from './account-analysis-facility-selection.models';

describe('account analysis facility selection models', () => {
  const accountAnalysis = {
    guid: 'account-analysis-a', accountId: 'account-a', analysisCategory: 'energy',
    energyIsSource: true, baselineYear: 2022, facilityAnalysisItems: []
  } as unknown as IdbAccountAnalysisItem;
  const facility = {
    guid: 'facility-a', accountId: 'account-a', isNewFacility: false,
    sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2021 }
  } as IdbFacility;

  it('reconciles links to current facilities while preserving selections and removing stale facilities', () => {
    const links = reconcileFacilityAnalysisLinks({ facilityAnalysisItems: [
      { facilityId: 'facility-a', analysisItemId: 'analysis-a' },
      { facilityId: 'deleted-facility', analysisItemId: 'analysis-old' }
    ] }, [facility, { ...facility, guid: 'facility-b' }]);

    expect(links).toEqual([
      { facilityId: 'facility-a', analysisItemId: 'analysis-a' },
      { facilityId: 'facility-b', analysisItemId: undefined }
    ]);
  });

  it('matches category, facility, energy basis, and baseline while allowing any new-facility baseline', () => {
    const matching = analysis({ guid: 'matching' });
    expect(facilityAnalysisEligible(matching, accountAnalysis, facility)).toBe(true);
    expect(facilityAnalysisEligible({ ...matching, energyIsSource: false }, accountAnalysis, facility)).toBe(false);
    expect(facilityAnalysisEligible({ ...matching, baselineYear: 2021 }, accountAnalysis, facility)).toBe(false);
    expect(facilityAnalysisEligible({ ...matching, baselineYear: 2021 }, accountAnalysis, { ...facility, isNewFacility: true })).toBe(true);
    expect(facilityAnalysisEligible({ ...matching, analysisCategory: 'water' }, accountAnalysis, facility)).toBe(false);
  });

  it('orders eligible candidates by modified date and projects every legacy analysis label', () => {
    const older = analysis({ guid: 'older', modifiedDate: new Date('2025-01-01'), groups: [group('skipAnalysis')] });
    const newer = analysis({ guid: 'newer', modifiedDate: new Date('2026-01-01'), groups: [group('regression')] });
    const candidates = eligibleFacilityAnalysisCandidates(
      [older, newer, analysis({ guid: 'wrong-baseline', baselineYear: 2020 })],
      accountAnalysis,
      facility,
      [],
      'ready',
      { meterGroups: [], meters: [], meterData: [], predictorData: [] }
    );

    expect(candidates.map(item => item.analysis.guid)).toEqual(['newer', 'older']);
    expect(candidates[0].groups[0].analysisLabel).toBe('Regression');
    expect([
      'absoluteEnergyConsumption', 'energyIntensity', 'modifiedEnergyIntensity', 'regression', 'skip', 'skipAnalysis'
    ].map(type => analysisTypeLabel(type as any))).toEqual([
      'Absolute', 'Intensity', 'Modified Intensity', 'Regression', 'Exclude', 'Skip All'
    ]);
  });

  it('uses the earliest latest input month as Data Through and requires every included input to have data', () => {
    const candidate = analysis({ groups: [{
      ...group('energyIntensity'), idbGroupId: 'group-a',
      predictorVariables: [{ id: 'predictor-a', productionInAnalysis: true }]
    } as any] });
    const inputs = {
      meterGroups: [],
      meters: [{ guid: 'meter-a', facilityId: 'facility-a', groupId: 'group-a' }] as any,
      meterData: [
        { meterId: 'meter-a', year: 2025, month: 6 },
        { meterId: 'meter-a', year: 2025, month: 8 }
      ] as any,
      predictorData: [{ predictorId: 'predictor-a', year: 2025, month: 7 }] as any
    };

    expect(facilityAnalysisDataThrough(candidate, inputs)).toEqual(new Date(2025, 6, 1));
    expect(facilityAnalysisDataThrough(candidate, { ...inputs, predictorData: [] })).toBeUndefined();
  });

  it('distinguishes assigned warnings and errors while treating skip as complete', () => {
    const selected = analysis({ guid: 'analysis-a', groups: [group('regression')] });
    const base = { ...accountAnalysis, facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: selected.guid }] };
    const errorFinding = finding('analysis-group.setup.invalid', 'error', `${selected.guid}:group-a`);
    const errorItem = buildFacilitySelectionItems(base, [facility], [selected], [errorFinding], 'ready')[0];
    expect(errorItem)
      .toMatchObject({ assigned: true, state: 'error', eligible: true });
    const errorCandidate = eligibleFacilityAnalysisCandidates(
      [selected], base, facility, [errorFinding], 'ready',
      { meterGroups: [], meters: [], meterData: [], predictorData: [] }
    )[0];
    expect(errorCandidate.badges).toEqual([{ label: 'Analysis Errors', severity: 'error' }]);
    expect(buildFacilitySelectionItems(
      { ...base, facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: 'skip' }] },
      [facility], [selected], [], 'ready'
    )[0]).toMatchObject({ assigned: true, state: 'skipped' });
    expect(buildFacilitySelectionItems(
      { ...base, facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: 'missing' }] },
      [facility], [selected], [], 'ready'
    )[0]).toMatchObject({ assigned: false, state: 'unconfigured', eligible: false });
  });

  it('uses the later goal baseline only for new facilities', () => {
    expect(facilityAnalysisBaselineForAccount(accountAnalysis, facility)).toBe(2022);
    expect(facilityAnalysisBaselineForAccount(accountAnalysis, {
      ...facility, isNewFacility: true,
      sustainabilityQuestions: { ...facility.sustainabilityQuestions, energyReductionBaselineYear: 2024 }
    })).toBe(2024);
  });
});

function analysis(overrides: Partial<IdbAnalysisItem>): IdbAnalysisItem {
  return {
    guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Analysis',
    analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022,
    modifiedDate: new Date('2025-01-01'), groups: [group('absoluteEnergyConsumption')],
    ...overrides
  } as IdbAnalysisItem;
}

function group(analysisType: any): any {
  return { idbGroupId: 'group-a', analysisType, predictorVariables: [], isGeneratedModel: false };
}

function finding(code: StatusItem['code'], severity: StatusItem['severity'], guid: string): StatusItem {
  return {
    id: `${code}:${guid}`, code, severity, category: 'configuration',
    entity: { kind: 'analysis-group', guid, name: 'Group', accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {}, title: 'Issue', description: 'Issue', todo: true, destination: { kind: 'unavailable' }
  };
}
