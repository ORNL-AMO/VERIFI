import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterStateSnapshot } from '@angular/router';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { ImportFileKind, ImportFileStatus } from '@data/import/spreadsheet-import.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ImportSessionService } from '../import-session.service';
import { stepsForDraft } from '../import-workflow.config';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

interface UploadFailure { name: string; message: string; }

@Component({
  selector: 'app-import-upload',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './import-upload.component.html',
  styleUrls: ['./import-upload.component.css']
})
export class ImportUploadComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  private readonly parser = inject(SpreadsheetImportDraftService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly unsaved = inject(UnsavedChangesService);
  readonly session = inject(ImportSessionService);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly failures = signal<UploadFailure[]>([]);
  readonly readingFiles = signal(false);
  readonly dragActive = signal(false);
  readonly sessionLost = signal(false);
  readonly formatLabels: Record<ImportFileKind, string> = {
    'verifi-v1': 'VERIFI Template',
    'verifi-v2': 'VERIFI Template',
    'verifi-v3': 'VERIFI Template',
    'energy-treasure-hunt': 'Energy Treasure Hunt',
    'general-workbook': 'Spread Sheet Columns',
    'footprint-tool': 'Energy Footprint Tool'
  };
  readonly statusLabels: Record<ImportFileStatus, string> = {
    queued: 'Queued',
    ready: 'Ready to process',
    invalid: 'Needs attention',
    importing: 'Saving data',
    completed: 'Uploaded'
  };
  private dragDepth = 0;
  private unregisterUnsaved?: () => void;

  ngOnInit(): void {
    this.sessionLost.set(this.route.snapshot.queryParamMap.get('sessionLost') === '1');
    const facilityGuid = this.route.snapshot.queryParamMap.get('facilityGuid') ?? undefined;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? undefined;
    if (facilityGuid || returnUrl) this.session.setOrigin({ facilityGuid, returnUrl });
    this.unregisterUnsaved = this.unsaved.register(
      () => this.hasUnsavedChanges(),
      () => this.session.clear(),
      () => this.isNavigationBlocked()
    );
  }

  ngOnDestroy(): void {
    this.unregisterUnsaved?.();
  }

  hasUnsavedChanges(): boolean { return this.session.hasUnsavedChanges(); }
  isNavigationBlocked(): boolean { return this.session.pending() || this.readingFiles(); }

  canNavigateWithoutDiscard(nextState: RouterStateSnapshot): boolean {
    const accountGuid = this.workspace.account()?.guid;
    return !!accountGuid && nextState.url.startsWith(`/v1/workspace/account/${accountGuid}/imports/file/`);
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() || this.isNavigationBlocked()) event.preventDefault();
  }

  async filesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    await this.processFiles(files);
    input.value = '';
  }

  dragEntered(event: DragEvent): void {
    event.preventDefault();
    if (this.isNavigationBlocked()) return;
    this.dragDepth += 1;
    this.dragActive.set(true);
  }

  dragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dragLeft(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragActive.set(false);
  }

  async filesDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.resetDragState();
    if (this.isNavigationBlocked()) return;
    await this.processFiles([...(event.dataTransfer?.files ?? [])]);
  }

  private async processFiles(files: File[]): Promise<void> {
    if (!files.length || this.readingFiles()) return;
    this.readingFiles.set(true);
    const failures: UploadFailure[] = [];
    try {
      for (const file of files) {
        try {
          if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) throw new Error('Choose an .xlsx, .xls, or .xlsm workbook.');
          const draft = await this.parser.readFile(file);
          const originFacility = this.session.origin().facilityGuid;
          if (originFacility && draft.importFacilities.some(facility => facility.guid === originFacility)) {
            draft.selectedFacilityId = originFacility;
            if (draft.kind === 'footprint-tool') this.parser.applyFootprintFacility(draft, originFacility);
          }
          this.session.addDrafts([draft]);
        } catch (error) {
          failures.push({ name: file.name, message: error instanceof Error ? error.message : String(error) });
        }
      }
    } finally {
      this.failures.set(failures);
      this.readingFiles.set(false);
    }
  }

  private resetDragState(): void {
    this.dragDepth = 0;
    this.dragActive.set(false);
  }

  openDraft(id: string): void {
    const draft = this.session.draft(id);
    const accountGuid = this.workspace.account()?.guid;
    if (!draft || !accountGuid || draft.status === 'invalid') return;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'file', id, stepsForDraft(draft)[0].id]);
  }
}
