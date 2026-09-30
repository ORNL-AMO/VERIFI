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
import { ImportMeterReviewStateService } from './import-meter-review-state.service';
import { ImportPredictorReviewStateService } from './import-predictor-review-state.service';
import { ImportWizardDraftStore } from './import-wizard-draft.store';
import { ImportWizardStateService } from './import-wizard-state.service';

describe('ImportWizardStateService', () => {
  let service: ImportWizardStateService;
  let draftService: {
    materializeGeneralRecords: ReturnType<typeof vi.fn>;
    replaceMeter: ReturnType<typeof vi.fn>;
    replacePredictor: ReturnType<typeof vi.fn>;
    assignColumns: ReturnType<typeof vi.fn>;
    assignFacilityMappingItems: ReturnType<typeof vi.fn>;
    setGeneralWorkbookDefaultFacility: ReturnType<typeof vi.fn>;
  };
  let workspaceMeters: ReturnType<typeof signal<IdbUtilityMeter[]>>;
  let workspaceMeterGroups: ReturnType<typeof signal<IdbUtilityMeterGroup[]>>;
  let workspaceMeterData: ReturnType<typeof signal<IdbUtilityMeterData[]>>;
  let workspaceFacilities: ReturnType<typeof signal<any[]>>;
  let workspacePredictors: ReturnType<typeof signal<IdbPredictor[]>>;
  let workspacePredictorData: ReturnType<typeof signal<IdbPredictorData[]>>;
  let commandCommit: ReturnType<typeof vi.fn>;
  let router: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    draftService = {
      materializeGeneralRecords: vi.fn(),
      replaceMeter: vi.fn(),
      replacePredictor: vi.fn(),
      assignFacilityMappingItems: vi.fn(),
      setGeneralWorkbookDefaultFacility: vi.fn((draft: ImportFileDraft, facilityId?: string) => {
        draft.selectedFacilityId = facilityId;
      }),
      assignColumns: vi.fn((draft: ImportFileDraft, itemIds: string[], target: string) => {
        const items = draft.columnGroups.flatMap(group => group.groupItems).filter(item => itemIds.includes(item.id));
        draft.columnGroups.forEach(group => group.groupItems = group.groupItems.filter(item => !itemIds.includes(item.id)));
        if (target === 'Date') {
          const date = draft.columnGroups.find(group => group.groupLabel === 'Date');
          const worksheet = draft.columnGroups.find(group => group.groupLabel === 'Worksheet Columns');
          worksheet?.groupItems.push(...(date?.groupItems ?? []));
          if (date) date.groupItems = [];
        }
        draft.columnGroups.find(group => group.groupLabel === target)?.groupItems.push(...items);
      })
    };
    workspaceMeters = signal([]);
    workspaceMeterGroups = signal([]);
    workspaceMeterData = signal([]);
    workspaceFacilities = signal([]);
    workspacePredictors = signal([]);
    workspacePredictorData = signal([]);
    commandCommit = vi.fn(async () => ({ affectedFacilityGuids: [] }));
    router = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ImportWizardStateService,
        ImportWizardDraftStore,
        ImportMeterReviewStateService,
        ImportPredictorReviewStateService,
        ImportSessionService,
        {
          provide: SpreadsheetImportDraftService,
          useValue: {
            ...draftService,
            visibleWorksheetNames: vi.fn(() => ['Data']),
            initializeFacilityMappings: vi.fn(),
            selectWorksheet: vi.fn(),
            assignColumn: vi.fn(),
            assignColumns: draftService.assignColumns,
            assignFacilityMappingItems: draftService.assignFacilityMappingItems,
            setGeneralWorkbookDefaultFacility: draftService.setGeneralWorkbookDefaultFacility,
            mapColumnToFacility: vi.fn(),
            addGeneralFacility: vi.fn(),
            applyFootprintFacility: vi.fn(),
            replaceMeter: draftService.replaceMeter,
            replacePredictor: draftService.replacePredictor
          }
        },
        { provide: SpreadsheetImportCommandService, useValue: { commit: commandCommit } },
        { provide: Router, useValue: router },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: () => ({ guid: 'account-1' }),
            facilities: workspaceFacilities,
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
    draft.headerMap = [{ Date: '2026-01-01', Electricity: 10 }];
    service.initialize(draft);
    service.activateStep('columns');

    expect(service.currentStepNumber()).toBe(2);
    expect(service.completeCurrentStep()).toBe('map-meters');
    expect(draft.completedSteps).toContain('columns');
    expect(draftService.materializeGeneralRecords).not.toHaveBeenCalled();
  });

  it('explains when Continue is blocked until Date and a data column are identified', () => {
    const draft = generalDraft();
    draft.columnGroups = [
      { id: 'unused', groupLabel: 'Worksheet Columns', groupItems: [{ id: 'meter-column', index: 1, value: 'Electricity' }] },
      { id: 'date', groupLabel: 'Date', groupItems: [{ id: 'date-column', index: 0, value: 'Date' }] },
      { id: 'meters', groupLabel: 'Meters', groupItems: [] },
      { id: 'predictors', groupLabel: 'Predictors', groupItems: [] }
    ];
    draft.headerMap = [{ Date: '2026-01-01', Electricity: 10 }];
    service.initialize(draft);

    expect(service.columnStepStatus().ready).toBe(false);
    expect(service.columnContinueMessage()).toBe('Move at least one column to Meters or Predictors.');

    service.moveColumns(['meter-column'], 'Meters');

    expect(service.columnStepStatus().ready).toBe(true);
    expect(service.columnContinueMessage()).toBeUndefined();
  });

  it('moves selected columns in one batch and invalidates dependent general-workbook steps', () => {
    const draft = generalDraft();
    draft.columnGroups = [
      { id: 'unused', groupLabel: 'Worksheet Columns', groupItems: [
        { id: 'electricity', index: 1, value: 'Electricity' },
        { id: 'gas', index: 2, value: 'Natural Gas' }
      ] },
      { id: 'date', groupLabel: 'Date', groupItems: [{ id: 'date-column', index: 0, value: 'Date' }] },
      { id: 'meters', groupLabel: 'Meters', groupItems: [] },
      { id: 'predictors', groupLabel: 'Predictors', groupItems: [] }
    ];
    draft.headerMap = [{ Date: '2026-01-01', Electricity: 12, 'Natural Gas': 4 }];
    draft.completedSteps = ['worksheet', 'columns', 'map-meters', 'meters', 'meter-readings', 'review'];
    service.initialize(draft);
    service.setColumnSelected('electricity', true);
    service.setColumnSelected('gas', true);

    service.moveSelectedColumns('Meters');

    expect(draftService.assignColumns).toHaveBeenCalledWith(draft, ['electricity', 'gas'], 'Meters');
    expect(service.meterColumns().map(column => column.id)).toEqual(['electricity', 'gas']);
    expect(draft.completedSteps).toEqual(['worksheet']);
    expect(service.selectedColumnIds()).toEqual([]);
    expect(service.columnAnnouncement()).toContain('2 columns moved to Meters');
  });

  it('swaps the existing date column and reports mixed invalid dates without blocking readiness', () => {
    const draft = generalDraft();
    draft.columnGroups = [
      { id: 'unused', groupLabel: 'Worksheet Columns', groupItems: [{ id: 'read-date', index: 1, value: 'Read Date' }] },
      { id: 'date', groupLabel: 'Date', groupItems: [{ id: 'date-column', index: 0, value: 'Date' }] },
      { id: 'meters', groupLabel: 'Meters', groupItems: [{ id: 'meter', index: 2, value: 'Electricity' }] },
      { id: 'predictors', groupLabel: 'Predictors', groupItems: [] }
    ];
    draft.headerMap = [
      { Date: '2026-01-01', 'Read Date': '2026-02-01', Electricity: 12 },
      { Date: '2026-02-01', 'Read Date': 'bad', Electricity: 13 }
    ];
    service.initialize(draft);

    service.moveColumns(['read-date'], 'Date');

    expect(service.columnTarget('date-column')).toBe('Worksheet Columns');
    expect(service.columnStepStatus()).toMatchObject({
      ready: true,
      date: { usableCount: 1, invalidCount: 1, invalidRows: [3] }
    });
    expect(service.columnAnnouncement()).toContain('Date was returned to Not imported');
  });

  it('selects and deselects individual workbook columns', () => {
    const draft = generalDraft();
    draft.columnGroups = [
      { id: 'unused', groupLabel: 'Worksheet Columns', groupItems: [
        { id: 'electricity', index: 1, value: 'Electricity' },
        { id: 'production', index: 2, value: 'Production' }
      ] },
      { id: 'date', groupLabel: 'Date', groupItems: [] },
      { id: 'meters', groupLabel: 'Meters', groupItems: [] },
      { id: 'predictors', groupLabel: 'Predictors', groupItems: [] }
    ];
    service.initialize(draft);

    service.setColumnSelected('electricity', true);
    service.setColumnSelected('production', true);

    expect(service.selectedColumnIds()).toEqual(['electricity', 'production']);

    service.setColumnSelected('electricity', false);

    expect(service.selectedColumnIds()).toEqual(['production']);
  });

  it('projects mapping lanes, counts, stable worksheet order, and readiness', () => {
    const draft = generalDraft();
    draft.importFacilities = [
      facility({ guid: 'facility-a', name: 'Plant A', color: '#112233' }),
      facility({ guid: 'facility-b', name: 'Plant B', color: '#445566' })
    ];
    draft.meterFacilityGroups = [
      { facilityId: 'unmapped-id', facilityName: 'Unmapped Meters', color: '', groupItems: [
        { id: 'gas', index: 2, value: 'Natural Gas' },
        { id: 'electricity', index: 1, value: 'Electricity' }
      ] },
      { facilityId: 'facility-a', facilityName: 'Plant A', color: '#112233', groupItems: [] },
      { facilityId: 'facility-b', facilityName: 'Plant B', color: '#445566', groupItems: [
        { id: 'water', index: 3, value: 'Water' }
      ] }
    ];
    service.initialize(draft);
    service.activateStep('map-meters');

    const board = service.mappingBoard('meter');

    expect(board.unmappedLane.cards.map(card => card.id)).toEqual(['electricity', 'gas']);
    expect(board.facilityLanes.map(lane => lane.label)).toEqual(['Plant A', 'Plant B']);
    expect(board.status).toEqual({ totalCount: 3, mappedCount: 1, unmappedCount: 2, ready: false });
    expect(service.selectedMappingItemIds()).toEqual(['electricity', 'gas']);
    expect(service.canContinueCurrentStep()).toBe(false);
    expect(service.stepContinueMessage()).toBe('Map all meter columns before continuing.');

    service.setMappingItemSelected('electricity', false);
    service.activateStep('map-meters');
    expect(service.selectedMappingItemIds()).toEqual(['gas']);

    service.activateStep('columns');
    service.activateStep('map-meters');
    expect(service.selectedMappingItemIds()).toEqual(['electricity', 'gas']);
  });

  it('moves selected mappings in one batch, clears moved selection, and invalidates dependent steps', () => {
    const draft = generalDraft();
    draft.importFacilities = [facility({ guid: 'facility-a', name: 'Plant A' })];
    draft.meterFacilityGroups = [
      { facilityId: 'unmapped-id', facilityName: 'Unmapped Meters', color: '', groupItems: [
        { id: 'electricity', index: 1, value: 'Electricity' },
        { id: 'gas', index: 2, value: 'Natural Gas' }
      ] },
      { facilityId: 'facility-a', facilityName: 'Plant A', color: '', groupItems: [] }
    ];
    draft.completedSteps = ['worksheet', 'columns', 'map-meters', 'meters', 'meter-readings'];
    service.initialize(draft);
    service.setMappingItemSelected('electricity', true);
    service.setMappingItemSelected('gas', true);

    service.moveSelectedFacilityMappingItems('meter', 'facility-a');

    expect(draftService.assignFacilityMappingItems).toHaveBeenCalledWith(
      draft, 'meter', ['electricity', 'gas'], 'facility-a'
    );
    expect(service.selectedMappingItemIds()).toEqual([]);
    expect(service.mappingAnnouncement()).toBe('2 meters moved to Plant A.');
    expect(draft.completedSteps).toEqual(['worksheet', 'columns']);
  });

  it('changes the worksheet facility default and invalidates mapping without invalidating earlier steps', () => {
    const draft = generalDraft();
    draft.importFacilities = [facility({ guid: 'facility-a', name: 'Plant A' })];
    draft.completedSteps = ['worksheet', 'columns', 'map-meters', 'meters'];
    service.initialize(draft);

    service.setGeneralWorkbookFacility('facility-a');

    expect(draftService.setGeneralWorkbookDefaultFacility).toHaveBeenCalledWith(draft, 'facility-a');
    expect(draft.completedSteps).toEqual(['worksheet', 'columns']);
    expect(service.mappingAnnouncement()).toContain('Plant A');
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

    service.meters.autoGroup();

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

    service.meters.toggleAllCalendarization();
    expect(draft.meters.map(value => value.meterReadingDataApplication)).toEqual(['backward', 'backward']);
    service.meters.toggleAllCalendarization();
    expect(draft.meters.map(value => value.meterReadingDataApplication)).toEqual(['fullYear', 'fullYear']);
    service.meters.toggleAllCalendarization();
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

    service.meters.setGroup(0, electricityGroup.guid);
    expect(service.draft().completedSteps).toEqual(completedSteps.filter(step => step !== 'review'));
    TestBed.inject(ImportSessionService).updateDraft(draft.id, current => current.completedSteps = [...completedSteps]);
    service.meters.setCalendarization(0, 'fullYear');
    expect(service.draft().completedSteps).toEqual(completedSteps.filter(step => step !== 'review'));
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

    expect(service.meters.availableExisting(0).map(value => value.guid)).toEqual([available.guid]);
  });

  it('delegates meter replacement and invalidates meter-reading and review completion', () => {
    const original = meter({ guid: 'original-meter', importWizardName: 'Source column' });
    const replacement = meter({ id: 4, guid: 'existing-meter' });
    const draft = templateDraft({
      meters: [original],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review']
    });
    service.initialize(draft);

    service.meters.save(original.guid, replacement);

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

    service.meters.save(original.guid, replacement);

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

    expect(service.meters.importedReadingCount()).toBe(2);
    expect(service.meters.readingRows()[0]).toMatchObject({
      newReadings: { count: 1 },
      existingReadings: { count: 1 },
      invalidReadings: { count: 0 },
      primaryUnitLabel: 'kWh'
    });
    expect(service.meters.readingRows()[0].comparisons[0].difference).toBe(2);
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

    service.meters.setSkipExistingReadings(selectedMeter.guid, true);
    expect(service.draft().skipExistingReadingsMeterIds).toEqual([selectedMeter.guid]);
    expect(service.draft().completedSteps).not.toContain('review');

    service.meters.setAllSkipExistingReadings(false);
    expect(service.draft().skipExistingReadingsMeterIds).toEqual([]);
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

    service.meters.toggleExcludedReading(0, true);
    expect(service.draft().completedSteps).not.toContain('meter-readings');
    expect(service.draft().completedSteps).not.toContain('review');

    TestBed.inject(ImportSessionService).updateDraft(draft.id, current => {
      current.completedSteps = ['facilities', 'meters', 'meter-readings', 'review'];
    });
    service.meters.setInvalidReadingsAcknowledged(true);
    expect(service.draft().completedSteps).toContain('meter-readings');
    expect(service.draft().completedSteps).not.toContain('review');
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

      expect(service.meters.readingRows()[0].newReadings.count).toBe(1);
      expect(service.meters.readingRows()[0].facilityName).toBeTruthy();
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

    expect(service.predictors.availableExisting(0).map(value => value.guid)).toEqual(['standard-a', 'weather-a']);
  });

  it('delegates predictor replacement and invalidates predictor-reading and review completion', () => {
    const original = predictor({ guid: 'import-a', importWizardName: 'Workbook output' });
    const replacement = predictor({ id: 7, guid: 'existing-a' });
    const draft = templateDraft({
      predictors: [original],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review']
    });
    service.initialize(draft);

    service.predictors.save(original.guid, replacement);

    expect(draftService.replacePredictor).toHaveBeenCalledWith(draft, original.guid, replacement);
    expect(draft.completedSteps).toEqual(['facilities', 'meters', 'meter-readings', 'predictors']);
  });

  it('bulk inclusion invalidates predictor readings while production invalidates only review', () => {
    const completed = ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings', 'review'];
    const draft = templateDraft({ predictors: [predictor()], completedSteps: [...completed] });
    service.initialize(draft);

    service.predictors.setProduction(0, true);
    expect(service.draft().completedSteps).toEqual(completed.filter(step => step !== 'review'));

    TestBed.inject(ImportSessionService).updateDraft(draft.id, current => current.completedSteps = [...completed]);
    service.predictors.setAllIncluded(false);
    expect(service.draft().predictors[0].skipImport).toBe(true);
    expect(service.draft().completedSteps).toEqual(completed.filter(step => step !== 'predictor-readings' && step !== 'review'));
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

    expect(service.predictors.readingRows()[0]).toMatchObject({
      newReadings: { count: 1 }, existingReadings: { count: 1 }, invalidReadings: { count: 0 }
    });
    expect(service.predictors.readingRows()[0].comparisons[0].difference).toBe(2);

    service.predictors.setSkipExistingReadings(selected.guid, true);
    expect(service.draft().skipExistingPredictorIds).toEqual([selected.guid]);
    expect(service.draft().completedSteps).not.toContain('review');
    service.predictors.setAllSkipExistingReadings(false);
    expect(service.draft().skipExistingPredictorIds).toEqual([]);
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

    service.predictors.toggleExcludedReading(0, true);
    expect(service.draft().completedSteps).not.toContain('predictor-readings');
    expect(service.draft().completedSteps).not.toContain('review');

    TestBed.inject(ImportSessionService).updateDraft(draft.id, current => {
      current.completedSteps = ['facilities', 'predictors', 'predictor-readings', 'review'];
    });
    service.predictors.setInvalidReadingsAcknowledged(true);
    expect(service.draft().completedSteps).toContain('predictor-readings');
    expect(service.draft().completedSteps).not.toContain('review');
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

    service.predictors.toggleIncluded(0, false);

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

  it('remaps index-qualified exclusions after skipped meters are removed from the commit request', async () => {
    const skipped = meter({ guid: 'skipped', skipImport: true });
    const included = meter({ guid: 'included' });
    const skippedReading = reading({ guid: 'skipped-reading', meterId: skipped.guid });
    const invalidReading = reading({ guid: 'included-reading', meterId: included.guid, month: 13 });
    const draft = templateDraft({
      meters: [skipped, included], meterData: [skippedReading, invalidReading],
      excludedMeterReadingIds: ['included-reading:1'], invalidMeterReadingsAcknowledged: true
    });
    service.initialize(draft);
    service.activateStep('review');

    await service.commit();

    expect(commandCommit).toHaveBeenCalledWith(expect.objectContaining({
      meterReadings: [invalidReading],
      excludedMeterReadingIds: ['included-reading:0']
    }));
  });

  it('does not submit a review with no records selected', async () => {
    service.initialize(generalDraft());
    service.activateStep('review');

    await service.commit();

    expect(commandCommit).not.toHaveBeenCalled();
    expect(service.error()).toBe('Include at least one record before uploading this file.');
  });

  it('returns the session-owned draft to ready when commit fails', async () => {
    commandCommit.mockRejectedValueOnce(new Error('write failed'));
    const draft = templateDraft({
      meters: [meter({})],
      completedSteps: ['facilities', 'meters', 'meter-readings', 'predictors', 'predictor-readings']
    });
    service.initialize(draft);
    service.activateStep('review');

    await service.commit();

    expect(service.draft().status).toBe('ready');
    expect(service.error()).toBe('write failed');
  });

  it('returns to a valid workspace origin after completion', () => {
    const selectedFacility = facility({ guid: 'facility-a', accountId: 'account-1' });
    workspaceFacilities.set([selectedFacility]);
    TestBed.inject(ImportSessionService).begin({
      facilityGuid: selectedFacility.guid,
      returnUrl: '/v1/workspace/facility/facility-a/data/predictors?tab=monthly'
    });
    service.initialize(templateDraft());

    service.viewImportedData();

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/v1/workspace/facility/facility-a/data/predictors?tab=monthly'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rejects a cross-account origin and uses the contextual fallback', () => {
    TestBed.inject(ImportSessionService).begin({
      returnUrl: '/v1/workspace/account/account-2/data/portfolio/facilities'
    });
    service.initialize(templateDraft());

    service.viewImportedData();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1/workspace/account', 'account-1', 'data', 'portfolio', 'facilities'
    ]);
  });

  it('prepares the facility review from included records and current reading decisions', () => {
    const selectedMeter = meter({ guid: 'meter-a', facilityId: 'facility-a', name: 'Electricity' });
    const current = reading({ guid: 'current', meterId: selectedMeter.guid, totalEnergyUse: 10 });
    const overlap = reading({ guid: 'overlap', meterId: selectedMeter.guid, totalEnergyUse: 12 });
    const added = reading({ guid: 'added', meterId: selectedMeter.guid, month: 2, totalEnergyUse: 15 });
    workspaceMeterData.set([current]);
    const draft = templateDraft({
      meters: [selectedMeter],
      meterData: [overlap, added],
      skipExistingReadingsMeterIds: [selectedMeter.guid]
    });
    service.initialize(draft);

    const summary = service.reviewSummary();

    expect(summary?.facilities[0]).toMatchObject({
      facility: expect.objectContaining({ guid: 'facility-a' }),
      meters: [{
        name: 'Electricity',
        readingActivity: [expect.objectContaining({ kind: 'new', count: 1 })]
      }],
      omissions: expect.objectContaining({ keptMeterReadings: 1 })
    });
    expect(summary?.overview.find(item => item.key === 'meterReadings')?.count).toBe(1);
  });

  it.each<ImportFileDraft['kind']>(['verifi-v1', 'verifi-v2', 'verifi-v3', 'energy-treasure-hunt', 'general-workbook'])(
    'prepares the same predictor-reading review contract for %s drafts',
    kind => {
      service.initialize({
        ...templateDraft({ predictors: [predictor()], predictorData: [predictorReading()] }),
        kind
      });

      expect(service.predictors.readingRows()[0].newReadings.count).toBe(1);
      expect(service.predictors.readingRows()[0].facilityName).toBeTruthy();
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
