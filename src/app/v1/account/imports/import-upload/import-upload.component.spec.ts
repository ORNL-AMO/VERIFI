import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ImportSessionService } from '../import-session.service';
import { ImportUploadComponent } from './import-upload.component';

describe('ImportUploadComponent', () => {
  let component: ImportUploadComponent;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SpreadsheetImportDraftService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        { provide: UnsavedChangesService, useValue: {} },
        {
          provide: ImportSessionService,
          useValue: {
            hasUnsavedChanges: () => true,
            pending: () => false,
            draft: () => ({ id: 'draft-1', kind: 'verifi-v3', status: 'ready' })
          }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: { account: () => ({ guid: 'account-1' }) }
        }
      ]
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new ImportUploadComponent());
  });

  it('transfers an unsaved upload session to its review route without discard confirmation', () => {
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-1/imports/file/draft-1/facilities'))).toBe(true);
  });

  it('builds Start review with separate imports and file route segments', () => {
    component.openDraft('draft-1');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1/workspace/account', 'account-1', 'imports', 'file', 'draft-1', 'facilities'
    ]);
    const commands = vi.mocked(router.navigate).mock.calls[0][0];
    expect(router.serializeUrl(router.createUrlTree(commands))).toBe(
      '/v1/workspace/account/account-1/imports/file/draft-1/facilities'
    );
  });

  it('keeps discard protection when leaving imports or switching accounts', () => {
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-1/settings/backup'))).toBe(false);
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-2/imports/file/draft-1/facilities'))).toBe(false);
  });
});

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}
