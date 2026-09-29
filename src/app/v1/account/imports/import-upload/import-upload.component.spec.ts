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
  let parser: {
    readFile: ReturnType<typeof vi.fn>;
    applyFootprintFacility: ReturnType<typeof vi.fn>;
  };
  let session: {
    hasUnsavedChanges: () => boolean;
    pending: () => boolean;
    draft: ReturnType<typeof vi.fn>;
    origin: ReturnType<typeof vi.fn>;
    addDrafts: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const draft = {
      id: 'draft-1',
      kind: 'verifi-v3',
      status: 'ready',
      importFacilities: [],
      completedSteps: []
    };
    parser = {
      readFile: vi.fn(async () => draft),
      applyFootprintFacility: vi.fn()
    };
    session = {
      hasUnsavedChanges: () => true,
      pending: () => false,
      draft: vi.fn(() => draft),
      origin: vi.fn(() => ({})),
      addDrafts: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SpreadsheetImportDraftService, useValue: parser },
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        { provide: UnsavedChangesService, useValue: {} },
        { provide: ImportSessionService, useValue: session },
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

  it('uses the same workbook parser for selected and dropped Excel files', async () => {
    const selected = new File(['selected'], 'selected.xlsx');
    const dropped = new File(['dropped'], 'dropped.xlsm');
    const input = { files: [selected], value: 'selected.xlsx' } as unknown as HTMLInputElement;

    await component.filesSelected({ target: input } as unknown as Event);
    await component.filesDropped(dragEvent([dropped]));

    expect(parser.readFile).toHaveBeenNthCalledWith(1, selected);
    expect(parser.readFile).toHaveBeenNthCalledWith(2, dropped);
    expect(session.addDrafts).toHaveBeenCalledTimes(2);
    expect(input.value).toBe('');
  });

  it('reports unsupported dropped files without passing them to the parser', async () => {
    await component.filesDropped(dragEvent([new File(['backup'], 'backup.json')]));

    expect(parser.readFile).not.toHaveBeenCalled();
    expect(component.failures()).toEqual([{
      name: 'backup.json',
      message: 'Choose an .xlsx, .xls, or .xlsm workbook.'
    }]);
  });

  it('keeps the drop field active until nested drag targets have been left', () => {
    const event = dragEvent([]);

    component.dragEntered(event);
    component.dragEntered(event);
    component.dragLeft(event);
    expect(component.dragActive()).toBe(true);

    component.dragLeft(event);
    expect(component.dragActive()).toBe(false);
  });
});

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

function dragEvent(files: File[]): DragEvent {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { files, dropEffect: 'none' }
  } as unknown as DragEvent;
}
