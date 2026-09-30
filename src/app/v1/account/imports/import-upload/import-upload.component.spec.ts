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
  let draft: any;
  let parser: {
    readFile: ReturnType<typeof vi.fn>;
    applyFootprintFacility: ReturnType<typeof vi.fn>;
  };
  let session: {
    hasUnsavedChanges: () => boolean;
    pending: () => boolean;
    draft: ReturnType<typeof vi.fn>;
    drafts: () => any[];
    origin: ReturnType<typeof vi.fn>;
    addDrafts: ReturnType<typeof vi.fn>;
    begin: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    draft = {
      id: 'draft-1',
      name: 'utility-data.xlsx',
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
      drafts: () => [draft],
      origin: vi.fn(() => ({})),
      addDrafts: vi.fn(),
      begin: vi.fn(),
      clear: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SpreadsheetImportDraftService, useValue: parser },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()) } },
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

  it('transfers an unsaved upload session to its processing route without discard confirmation', () => {
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(component.canNavigateWithoutDiscard(state('/v1/workspace/account/account-1/imports/file/draft-1/facilities'))).toBe(true);
  });

  it('builds Process Upload with separate imports and file route segments', () => {
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

  it('renders upload guidance, template download, friendly queue labels, and a quiet backup import path', () => {
    const fixture = TestBed.createComponent(ImportUploadComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Upload spreadsheet data');
    expect([...element.querySelectorAll('.upload-option h2')].map(node => node.textContent?.trim())).toEqual([
      'VERIFI Template', 'Spread Sheet Columns', 'Other'
    ]);
    expect(element.querySelector('.upload-options')?.textContent).toContain('Energy Footprint Tool');
    expect(element.querySelector('.upload-options')?.textContent).toContain('Energy Treasure Hunt');
    expect(element.textContent).not.toContain('What you can upload');
    const templateLink = element.querySelector<HTMLAnchorElement>('.template-link');
    expect(templateLink?.getAttribute('href')).toBe('assets/csv_templates/VERIFI-Import-Data.xlsx');
    expect(templateLink?.hasAttribute('download')).toBe(true);
    expect(templateLink?.closest('.upload-header')).not.toBeNull();
    expect(templateLink?.closest('.upload-option')).toBeNull();
    expect(element.querySelector('app-ui-icon[name="uploadData"]')).not.toBeNull();
    expect(element.querySelector('.queue-list')?.textContent).toContain('VERIFI Template · Ready to process');
    expect(element.querySelector('.queue-list')?.textContent).not.toContain('verifi-v3');
    expect(element.querySelector('.queue-list button')?.textContent).toContain('Process Upload');
    expect(element.textContent?.toLowerCase()).not.toContain('review');
    const backupLink = element.querySelector<HTMLAnchorElement>('.backup-import a');
    expect(backupLink?.textContent).toContain('Import a VERIFI backup (.json)');
    expect(backupLink?.getAttribute('href')).toBe('/v1/workspace/account/account-1/settings/backup');
  });

  it('renders session loss, processing, and file-specific error states accessibly', () => {
    const fixture = TestBed.createComponent(ImportUploadComponent);
    fixture.detectChanges();
    fixture.componentInstance.sessionLost.set(true);
    fixture.componentInstance.readingFiles.set(true);
    fixture.componentInstance.failures.set([{ name: 'bad.json', message: 'Choose an Excel workbook.' }]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.v1-alert--info[role="status"]')?.textContent).toContain('temporary upload session');
    expect(element.querySelector('.file-drop strong')?.textContent).toContain('Reading files');
    expect(element.querySelector<HTMLButtonElement>('.file-drop button')?.disabled).toBe(true);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('bad.json');
  });

  it('renders an active drop target while files are dragged over it', () => {
    const fixture = TestBed.createComponent(ImportUploadComponent);
    fixture.detectChanges();

    fixture.componentInstance.dragEntered(dragEvent([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.file-drop').classList).toContain('is-drag-active');
    expect(fixture.nativeElement.querySelector('.file-drop strong').textContent).toContain('Drop files to add them');
  });

  it('keeps the empty upload state focused on the drop field and backup alternative', () => {
    session.drafts = () => [];
    const fixture = TestBed.createComponent(ImportUploadComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.file-drop')).not.toBeNull();
    expect(element.querySelector('.queue-list')).toBeNull();
    expect(element.querySelector('.backup-import')).not.toBeNull();
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
