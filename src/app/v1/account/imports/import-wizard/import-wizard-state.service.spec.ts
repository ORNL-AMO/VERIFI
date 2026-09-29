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
import { facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { ImportSessionService } from '../import-session.service';
import { ImportWizardStateService } from './import-wizard-state.service';

describe('ImportWizardStateService', () => {
  let service: ImportWizardStateService;
  let draftService: {
    materializeGeneralRecords: ReturnType<typeof vi.fn>;
    replaceMeter: ReturnType<typeof vi.fn>;
  };
  let workspaceMeters: ReturnType<typeof signal<IdbUtilityMeter[]>>;
  let workspaceMeterGroups: ReturnType<typeof signal<IdbUtilityMeterGroup[]>>;
  let workspaceMeterData: ReturnType<typeof signal<IdbUtilityMeterData[]>>;

  beforeEach(() => {
    draftService = { materializeGeneralRecords: vi.fn(), replaceMeter: vi.fn() };
    workspaceMeters = signal([]);
    workspaceMeterGroups = signal([]);
    workspaceMeterData = signal([]);
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
            replaceMeter: draftService.replaceMeter
          }
        },
        { provide: SpreadsheetImportCommandService, useValue: { commit: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: () => ({ guid: 'account-1' }),
            facilities: () => [],
            meters: workspaceMeters,
            meterGroups: workspaceMeterGroups,
            meterData: workspaceMeterData,
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
    excludedMeterReadingIds: []
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
