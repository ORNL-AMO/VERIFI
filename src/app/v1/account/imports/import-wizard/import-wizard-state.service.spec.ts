import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { getEmptyFileReference, ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { ImportSessionService } from '../import-session.service';
import { ImportWizardStateService } from './import-wizard-state.service';

describe('ImportWizardStateService', () => {
  let service: ImportWizardStateService;
  let draftService: {
    materializeGeneralRecords: ReturnType<typeof vi.fn>;
    replaceMeter: ReturnType<typeof vi.fn>;
    replacePredictor: ReturnType<typeof vi.fn>;
  };
  let workspaceMeters: ReturnType<typeof signal<IdbUtilityMeter[]>>;
  let workspaceMeterGroups: ReturnType<typeof signal<IdbUtilityMeterGroup[]>>;
  let workspaceMeterData: ReturnType<typeof signal<IdbUtilityMeterData[]>>;
  let workspacePredictors: ReturnType<typeof signal<IdbPredictor[]>>;
  let workspacePredictorData: ReturnType<typeof signal<IdbPredictorData[]>>;
  let commandCommit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    draftService = { materializeGeneralRecords: vi.fn(), replaceMeter: vi.fn(), replacePredictor: vi.fn() };
    workspaceMeters = signal([]);
    workspaceMeterGroups = signal([]);
    workspaceMeterData = signal([]);
    workspacePredictors = signal([]);
    workspacePredictorData = signal([]);
    commandCommit = vi.fn(async () => ({ affectedFacilityGuids: [] }));
    TestBed.configureTestingModule({
      providers: [
        ImportWizardStateService,
        ImportSessionService,
        {
          provide: SpreadsheetImportDraftService,
          useValue: {
            ...draftService,
            visibleWorksheetNames: vi.fn(() => ['Data']),
            initializeFacilityMappings: vi.fn(),
            selectWorksheet: vi.fn(),
            assignColumn: vi.fn(),
            mapColumnToFacility: vi.fn(),
            addGeneralFacility: vi.fn(),
            applyFootprintFacility: vi.fn(),
            replaceMeter: draftService.replaceMeter,
            replacePredictor: draftService.replacePredictor
          }
        },
        { provide: SpreadsheetImportCommandService, useValue: { commit: commandCommit } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: () => ({ guid: 'account-1' }),
            facilities: () => [],
            meters: workspaceMeters,
            meterGroups: workspaceMeterGroups,
            meterData: workspaceMeterData,
            predictors: workspacePredictors,
            predictorData: workspacePredictorData,
            customFuels: () => [],
            customGWPs: () => []
          }
        }
      ]
    });
    service = TestBed.inject(ImportWizardStateService);
  });

  it('blocks a deep link beyond the first incomplete child route', () => {
    const draft = generalDraft();
    service.initialize(draft);

    expect(service.allowedStep('review')).toBe('worksheet');
    draft.completedSteps.push('worksheet');
    expect(service.allowedStep('columns')).toBe('columns');
  });

  it('validates and completes the active step before advancing', () => {
    const draft = generalDraft();
    draft.columnGroups = [
      { id: 'date', groupLabel: 'Date', groupItems: [{ id: 'date-column', index: 0, value: 'Date' }] },
      { id: 'meters', groupLabel: 'Meters', groupItems: [{ id: 'meter-column', index: 1, value: 'Electricity' }] }
    ];
    service.initialize(draft);
    service.activateStep('columns');

    expect(service.currentStepNumber()).toBe(2);
    expect(service.completeCurrentStep()).toBe('map-meters');
    expect(draft.completedSteps).toContain('columns');
    expect(draftService.materializeGeneralRecords).not.toHaveBeenCalled();
  });

  it('auto-groups only ungrouped meters and synchronizes referenced draft groups', () => {
    const electricityGroup = group({ guid: 'electricity-group', name: 'Electricity', id: 1 });
    const manualGroup = group({ guid: 'manual-group', name: 'Manual', id: 2 });
    workspaceMeterGroups.set([electricityGroup, manualGroup]);
    const draft = templateDraft({
      meters: [
        meter({ guid: 'electricity-meter', facilityId: 'facility-a', groupId: undefined }),
        meter({ guid: 'manual-meter', facilityId: 'facility-a', groupId: manualGroup.guid }),
        meter({ guid: 'other-meter', facilityId: 'facility-a', source: 'Other', startingUnit: 'kg' })
      ]
    });
    service.initialize(draft);

    service.autoGroupMeters();

    expect(draft.meters[0].groupId).toBe(electricityGroup.guid);
    expect(draft.meters[1].groupId).toBe(manualGroup.guid);
    const otherGroup = draft.newMeterGroups.find(candidate => candidate.name === 'Other (non-energy)');
    expect(otherGroup).toBeDefined();
    expect(draft.meters[2].groupId).toBe(otherGroup.guid);
    expect(draft.newMeterGroups).toEqual([otherGroup]);
  });

  it('cycles every meter through all three calendarization methods', () => {
    const draft = templateDraft({ meters: [meter({ guid: 'one' }), meter({ guid: 'two', skipImport: true })] });
    service.initialize(draft);

    service.toggleAllMeterCalendarization();
    expect(draft.meters.map(value => value.meterReadingDataApplication)).toEqual(['backward', 'backward']);
    service.toggleAllMeterCalendarization();
    expect(draft.meters.map(value => value.meterReadingDataApplication)).toEqual(['fullYear', 'fullYear']);
    service.toggleAllMeterCalendarization();
    expect(draft.meters.map(value => value.meterReadingDataApplication)).toEqual(['fullMonth', 'fullMonth']);
  });

  it('requires the shared-form calendarization rule before completing meter review', () => {
    const draft = templateDraft({ meters: [meter({ meterReadingDataApplication: undefined })] });
    service.initialize(draft);
    service.activateStep('meters');

    expect(service.completeCurrentStep()).toBeUndefined();
    expect(service.error()).toContain('invalid meter');
  });

  it('allows a skipped invalid meter to pass review', () => {
    const draft = templateDraft({
      meters: [meter({ meterReadingDataApplication: undefined, skipImport: true })]
    });
    service.initialize(draft);
    service.activateStep('meters');

    expect(service.completeCurrentStep()).toBe('meter-readings');
  });

  it('invalidates only final review for group and calendarization changes', () => {
    const electricityGroup = group({ guid: 'electricity-group', name: 'Electricity', id: 1 });
    workspaceMeterGroups.set([electricityGroup]);
    const completedSteps = ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review'];
    const draft = templateDraft({ meters: [meter({ groupId: undefined })], completedSteps: [...completedSteps] });
    service.initialize(draft);

    service.setMeterGroup(0, electricityGroup.guid);
    expect(draft.completedSteps).toEqual(completedSteps.filter(step => step !== 'review'));
    draft.completedSteps = [...completedSteps];
    service.setMeterCalendarization(0, 'fullYear');
    expect(draft.completedSteps).toEqual(completedSteps.filter(step => step !== 'review'));
  });

  it('offers only unused existing meters from the same facility', () => {
    const available = meter({ id: 1, guid: 'available', facilityId: 'facility-a' });
    const used = meter({ id: 2, guid: 'used', facilityId: 'facility-a' });
    const otherFacility = meter({ id: 3, guid: 'other-facility', facilityId: 'facility-b' });
    workspaceMeters.set([available, used, otherFacility]);
    const draft = templateDraft({
      meters: [meter({ guid: 'new-meter', facilityId: 'facility-a' }), used]
    });
    service.initialize(draft);

    expect(service.availableExistingMeters(0).map(value => value.guid)).toEqual([available.guid]);
  });

  it('delegates meter replacement and invalidates meter-reading and review completion', () => {
    const original = meter({ guid: 'original-meter', importWizardName: 'Source column' });
    const replacement = meter({ id: 4, guid: 'existing-meter' });
    const draft = templateDraft({
      meters: [original],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review']
    });
    service.initialize(draft);

    service.saveMeter(original.guid, replacement);

    expect(draftService.replaceMeter).toHaveBeenCalledWith(draft, original.guid, replacement);
    expect(draft.completedSteps).toEqual(['facilities', 'meters', 'predictors', 'predictor-readings']);
  });

  it('clears a group when edited meter settings are no longer compatible', () => {
    const energyGroup = group({ guid: 'energy-group', id: 1, groupType: 'Energy' });
    workspaceMeterGroups.set([energyGroup]);
    const original = meter({ guid: 'original-meter', groupId: energyGroup.guid });
    const replacement = meter({
      guid: original.guid,
      source: 'Water Intake',
      waterIntakeType: 'Municipal (Potable)',
      groupId: energyGroup.guid
    });
    const draft = templateDraft({ meters: [original] });
    service.initialize(draft);

    service.saveMeter(original.guid, replacement);

    expect(draftService.replaceMeter).toHaveBeenCalledWith(
      draft,
      original.guid,
      expect.objectContaining({ groupId: undefined })
    );
  });

  it('prepares per-meter reading summaries from included draft and workspace readings', () => {
    const selectedMeter = meter({ guid: 'meter-a', facilityId: 'facility-a', startingUnit: 'kWh' });
    const current = reading({ guid: 'current', meterId: selectedMeter.guid, year: 2026, month: 1, day: 1, totalEnergyUse: 10 });
    const overlap = reading({ guid: 'overlap', meterId: selectedMeter.guid, year: 2026, month: 1, day: 1, totalEnergyUse: 12 });
    const added = reading({ guid: 'added', meterId: selectedMeter.guid, year: 2026, month: 2, day: 1, totalEnergyUse: 15 });
    workspaceMeterData.set([current]);
    service.initialize(templateDraft({ meters: [selectedMeter], meterData: [overlap, added] }));

    expect(service.importedMeterReadingCount()).toBe(2);
    expect(service.meterReadingRows()[0]).toMatchObject({
      newReadings: { count: 1 },
      existingReadings: { count: 1 },
      invalidReadings: { count: 0 },
      primaryUnitLabel: 'kWh'
    });
    expect(service.meterReadingRows()[0].comparisons[0].difference).toBe(2);
  });

  it('synchronizes keep-current decisions and invalidates final review', () => {
    const selectedMeter = meter({ guid: 'meter-a', facilityId: 'facility-a' });
    const imported = reading({ guid: 'imported', meterId: selectedMeter.guid, year: 2026, month: 1, day: 1 });
    workspaceMeterData.set([reading({ guid: 'current', meterId: selectedMeter.guid, year: 2026, month: 1, day: 1 })]);
    const draft = templateDraft({
      meters: [selectedMeter],
      meterData: [imported],
      skipExistingReadingsMeterIds: ['stale-meter'],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'review']
    });
    service.initialize(draft);

    service.setSkipExistingMeterReadings(selectedMeter.guid, true);
    expect(draft.skipExistingReadingsMeterIds).toEqual([selectedMeter.guid]);
    expect(draft.completedSteps).not.toContain('review');

    service.setAllSkipExistingMeterReadings(false);
    expect(draft.skipExistingReadingsMeterIds).toEqual([]);
  });

  it('clears meter-reading completion only while invalid exclusions are unresolved', () => {
    const selectedMeter = meter({ guid: 'meter-a', facilityId: 'facility-a' });
    const invalid = reading({ guid: 'invalid', meterId: selectedMeter.guid, month: 13 });
    const draft = templateDraft({
      meters: [selectedMeter],
      meterData: [invalid],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'review']
    });
    service.initialize(draft);
    service.activateStep('meter-readings');

    expect(service.completeCurrentStep()).toBeUndefined();
    expect(service.error()).toContain('Exclude every invalid meter reading');

    service.toggleExcludedReading(0, true);
    expect(draft.completedSteps).not.toContain('meter-readings');
    expect(draft.completedSteps).not.toContain('review');

    draft.completedSteps = ['facilities', 'meters', 'meter-readings', 'review'];
    service.setInvalidMeterReadingsAcknowledged(true);
    expect(draft.completedSteps).toContain('meter-readings');
    expect(draft.completedSteps).not.toContain('review');
    expect(service.completeCurrentStep()).toBe('predictors');
  });

  it('does not block meter reading review for an invalid reading owned by a skipped meter', () => {
    const skippedMeter = meter({ guid: 'meter-a', facilityId: 'facility-a', skipImport: true });
    const draft = templateDraft({
      meters: [skippedMeter],
      meterData: [reading({ guid: 'invalid', meterId: skippedMeter.guid, month: 13 })]
    });
    service.initialize(draft);
    service.activateStep('meter-readings');

    expect(service.completeCurrentStep()).toBe('predictors');
  });

  it.each<ImportFileDraft['kind']>(['verifi-v1', 'verifi-v2', 'verifi-v3', 'general-workbook'])(
    'prepares the same meter-reading review contract for %s drafts',
    kind => {
      const selectedMeter = meter({ guid: 'meter-a', facilityId: 'facility-a' });
      service.initialize({
        ...templateDraft({
          meters: [selectedMeter],
          meterData: [reading({ guid: 'reading-a', meterId: selectedMeter.guid })]
        }),
        kind
      });

      expect(service.meterReadingRows()[0].newReadings.count).toBe(1);
      expect(service.meterReadingRows()[0].facilityName).toBeTruthy();
    }
  );

  it('offers unused same-facility Standard and valid Weather predictor matches', () => {
    const standard = predictor({ id: 1, guid: 'standard-a' });
    const weather = predictor({
      id: 2, guid: 'weather-a', predictorType: 'Weather', weatherStationId: 'KORD',
      weatherStationName: 'Chicago O’Hare', weatherDataType: 'HDD', heatingBaseTemperature: 60
    });
    const invalidWeather = predictor({ id: 3, guid: 'weather-invalid', predictorType: 'Weather' });
    const used = predictor({ id: 4, guid: 'used-a' });
    const otherFacility = predictor({ id: 5, guid: 'other-a', facilityId: 'facility-b' });
    workspacePredictors.set([standard, weather, invalidWeather, used, otherFacility]);
    const draft = templateDraft({ predictors: [predictor({ guid: 'import-a' }), used] });
    service.initialize(draft);

    expect(service.availableExistingPredictors(0).map(value => value.guid)).toEqual(['standard-a', 'weather-a']);
  });

  it('delegates predictor replacement and invalidates predictor-reading and review completion', () => {
    const original = predictor({ guid: 'import-a', importWizardName: 'Workbook output' });
    const replacement = predictor({ id: 7, guid: 'existing-a' });
    const draft = templateDraft({
      predictors: [original],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review']
    });
    service.initialize(draft);

    service.savePredictor(original.guid, replacement);

    expect(draftService.replacePredictor).toHaveBeenCalledWith(draft, original.guid, replacement);
    expect(draft.completedSteps).toEqual(['facilities', 'meters', 'meter-readings', 'predictors']);
  });

  it('bulk inclusion invalidates predictor readings while production invalidates only review', () => {
    const completed = ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review'];
    const draft = templateDraft({ predictors: [predictor()], completedSteps: [...completed] });
    service.initialize(draft);

    service.setPredictorProduction(0, true);
    expect(draft.completedSteps).toEqual(completed.filter(step => step !== 'review'));

    draft.completedSteps = [...completed];
    service.setAllPredictorsIncluded(false);
    expect(draft.predictors[0].skipImport).toBe(true);
    expect(draft.completedSteps).toEqual(completed.filter(step => step !== 'predictor-readings' && step !== 'review'));
  });

  it('prepares predictor reading summaries and synchronizes per-predictor keep-current decisions', () => {
    const selected = predictor({ guid: 'predictor-a' });
    const current = predictorReading({ guid: 'current', amount: 10 });
    const overlap = predictorReading({ guid: 'overlap', amount: 12 });
    const added = predictorReading({ guid: 'added', month: 2, amount: 15 });
    workspacePredictorData.set([current]);
    const draft = templateDraft({
      predictors: [selected], predictorData: [overlap, added], skipExistingPredictorIds: ['stale-predictor'],
      completedSteps: ['facilities', 'predictors', 'predictor-readings', 'review']
    });
    service.initialize(draft);

    expect(service.predictorReadingRows()[0]).toMatchObject({
      newReadings: { count: 1 }, existingReadings: { count: 1 }, invalidReadings: { count: 0 }
    });
    expect(service.predictorReadingRows()[0].comparisons[0].difference).toBe(2);

    service.setSkipExistingPredictorReadings(selected.guid, true);
    expect(draft.skipExistingPredictorIds).toEqual([selected.guid]);
    expect(draft.completedSteps).not.toContain('review');
    service.setAllSkipExistingPredictorReadings(false);
    expect(draft.skipExistingPredictorIds).toEqual([]);
  });

  it('blocks predictor readings until invalid values are excluded and acknowledged', () => {
    const draft = templateDraft({
      predictors: [predictor()],
      predictorData: [predictorReading({ amount: -1 })],
      completedSteps: ['facilities', 'predictors', 'predictor-readings', 'review']
    });
    service.initialize(draft);
    service.activateStep('predictor-readings');

    expect(service.completeCurrentStep()).toBeUndefined();
    expect(service.error()).toContain('Exclude every invalid predictor reading');

    service.toggleExcludedPredictorReading(0, true);
    expect(draft.completedSteps).not.toContain('predictor-readings');
    expect(draft.completedSteps).not.toContain('review');

    draft.completedSteps = ['facilities', 'predictors', 'predictor-readings', 'review'];
    service.setInvalidPredictorReadingsAcknowledged(true);
    expect(draft.completedSteps).toContain('predictor-readings');
    expect(draft.completedSteps).not.toContain('review');
    expect(service.completeCurrentStep()).toBe('review');
  });

  it('clears stale predictor reading decisions when a predictor is skipped', () => {
    const imported = predictorReading();
    const draft = templateDraft({
      predictors: [predictor()], predictorData: [imported],
      skipExistingPredictorIds: ['predictor-a'],
      excludedPredictorReadingIds: [imported.guid],
      invalidPredictorReadingsAcknowledged: true
    });
    service.initialize(draft);

    service.togglePredictorIncluded(0, false);

    expect(draft.skipExistingPredictorIds).toEqual([]);
    expect(draft.excludedPredictorReadingIds).toEqual([]);
    expect(draft.invalidPredictorReadingsAcknowledged).toBe(false);
  });

  it('remaps index-qualified exclusions after skipped predictors are removed from the commit request', async () => {
    const skipped = predictor({ guid: 'skipped', skipImport: true });
    const included = predictor({ guid: 'included' });
    const skippedReading = predictorReading({ guid: 'skipped-reading', predictorId: skipped.guid });
    const invalidReading = predictorReading({ guid: 'included-reading', predictorId: included.guid, month: 13 });
    const draft = templateDraft({
      predictors: [skipped, included], predictorData: [skippedReading, invalidReading],
      excludedPredictorReadingIds: ['included-reading:1'], invalidPredictorReadingsAcknowledged: true
    });
    service.initialize(draft);
    service.activateStep('review');

    await service.commit();

    expect(commandCommit).toHaveBeenCalledWith(expect.objectContaining({
      predictorReadings: [invalidReading],
      excludedPredictorReadingIds: ['included-reading:0']
    }));
  });

  it.each<ImportFileDraft['kind']>(['verifi-v1', 'verifi-v2', 'verifi-v3', 'energy-treasure-hunt', 'general-workbook'])(
    'prepares the same predictor-reading review contract for %s drafts',
    kind => {
      service.initialize({
        ...templateDraft({ predictors: [predictor()], predictorData: [predictorReading()] }),
        kind
      });

      expect(service.predictorReadingRows()[0].newReadings.count).toBe(1);
      expect(service.predictorReadingRows()[0].facilityName).toBeTruthy();
    }
  );
});

function generalDraft(): ImportFileDraft {
  return {
    ...getEmptyFileReference(),
    id: 'draft-1',
    name: 'general.xlsx',
    kind: 'general-workbook',
    status: 'ready',
    findings: [],
    completedSteps: [],
    invalidMeterReadingsAcknowledged: false,
    excludedMeterReadingIds: [],
    skipExistingPredictorIds: [],
    invalidPredictorReadingsAcknowledged: false,
    excludedPredictorReadingIds: []
  };
}

function templateDraft(values: Partial<ImportFileDraft> = {}): ImportFileDraft {
  return {
    ...generalDraft(),
    kind: 'verifi-v2',
    importFacilities: [facility({ guid: 'facility-a', accountId: 'account-1' })],
    ...values
  };
}

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-1', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    description: '', importWizardName: 'Production', production: false, productionInAnalysis: false,
    predictorType: 'Standard', weatherDataType: 'HDD', weatherStationId: '', weatherStationName: '',
    skipImport: false, ...overrides
  } as IdbPredictor;
}

function predictorReading(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'predictor-reading-a', accountId: 'account-1', facilityId: 'facility-a', predictorId: 'predictor-a',
    year: 2026, month: 1, amount: 10, weatherDataWarning: false, weatherOverride: false, ...overrides
  } as IdbPredictorData;
}
