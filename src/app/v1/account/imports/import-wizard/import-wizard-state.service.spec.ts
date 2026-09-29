import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { getEmptyFileReference, ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { ImportSessionService } from '../import-session.service';
import { ImportWizardStateService } from './import-wizard-state.service';

describe('ImportWizardStateService', () => {
  let service: ImportWizardStateService;
  let draftService: { materializeGeneralRecords: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    draftService = { materializeGeneralRecords: vi.fn() };
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
            applyFootprintFacility: vi.fn()
          }
        },
        { provide: SpreadsheetImportCommandService, useValue: { commit: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: () => ({ guid: 'account-1' }),
            facilities: () => [],
            meters: () => [],
            meterGroups: () => []
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

    expect(service.completeCurrentStep()).toBe('map-meters');
    expect(draft.completedSteps).toContain('columns');
    expect(draftService.materializeGeneralRecords).toHaveBeenCalledWith(draft);
  });
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
