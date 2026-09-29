import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterStateSnapshot } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ImportSessionService } from '../import-session.service';
import { ImportUploadComponent } from './import-upload.component';

describe('ImportUploadComponent', () => {
  let component: ImportUploadComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SpreadsheetImportDraftService, useValue: {} },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        { provide: UnsavedChangesService, useValue: {} },
        {
          provide: ImportSessionService,
          useValue: { hasUnsavedChanges: () => true, pending: () => false }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: { account: () => ({ guid: 'account-1' }) }
        }
      ]
    });
    component = TestBed.runInInjectionContext(() => new ImportUploadComponent());
  });

  it('transfers an unsaved upload session to its review route without discard confirmation', () => {
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-1/imports/file/draft-1/facilities'))).toBe(true);
  });

  it('keeps discard protection when leaving imports or switching accounts', () => {
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-1/settings/backup'))).toBe(false);
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-2/imports/file/draft-1/facilities'))).toBe(false);
  });
});

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}
