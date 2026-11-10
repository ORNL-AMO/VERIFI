import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Injector, OnDestroy, OnInit, afterNextRender, computed, inject, signal, viewChild, viewChildren } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterStateSnapshot } from '@angular/router';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { ImportFileStatus } from '@data/import/spreadsheet-import.models';
import { importFormat } from '@data/import/spreadsheet-import-format.registry';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ImportSessionService } from '../import-session.service';
import { stepsForDraft } from '../import-workflow.config';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
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
  private readonly injector = inject(Injector);
  private readonly browseButton = viewChild<ElementRef<HTMLButtonElement>>('browseFilesButton');
  private readonly removeButtons = viewChildren<ElementRef<HTMLButtonElement>>('removeQueueFile');
  readonly session = inject(ImportSessionService);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly failures = signal<UploadFailure[]>([]);
  readonly readingFiles = signal(false);
  readonly dragActive = signal(false);
  readonly sessionLost = signal(false);
  readonly queueAnnouncement = signal('');
  readonly queueLocked = computed(() => this.isNavigationBlocked());
  readonly statusLabels: Record<ImportFileStatus, string> = {
    queued: 'Queued',
    ready: 'Ready to process',
    invalid: 'Needs attention',
    importing: 'Saving data',
    completed: 'Uploaded'
  };
  private dragDepth = 0;
  private unregisterUnsaved?: () => void;

  readonly formatLabel = (kind: Parameters<typeof importFormat>[0]): string => importFormat(kind).label;

  ngOnInit(): void {
    this.sessionLost.set(this.route.snapshot.queryParamMap.get('sessionLost') === '1');
    const facilityGuid = this.route.snapshot.queryParamMap.get('facilityGuid') ?? undefined;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? undefined;
    this.session.begin({ facilityGuid, returnUrl });
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
  isNavigationBlocked(): boolean { return this.session.navigationBlocked() || this.readingFiles(); }

  canNavigateWithoutDiscard(nextState: RouterStateSnapshot): boolean {
    const accountGuid = this.workspace.account()?.guid;
    return !!accountGuid && nextState.url.startsWith(`/v1/workspace/account/${accountGuid}/imports/file/`);
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() || this.isNavigationBlocked()) event.preventDefault();
  }

  async filesSelected(files: FileList | null): Promise<void> {
    await this.processFiles([...(files ?? [])]);
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
    if (!files.length || this.isNavigationBlocked()) return;
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

  removeDraft(id: string): void {
    if (this.isNavigationBlocked()) return;
    const index = this.session.drafts().findIndex(draft => draft.id === id);
    const draft = this.session.draft(id);
    if (!draft || !this.session.removeDraft(id)) return;
    this.queueAnnouncement.set(`${draft.name} removed from the upload queue.`);
    afterNextRender(() => {
      const buttons = this.removeButtons();
      const next = buttons[Math.min(index, buttons.length - 1)]?.nativeElement;
      (next ?? this.browseButton()?.nativeElement)?.focus();
    }, { injector: this.injector });
  }

  openDraft(id: string): void {
    const draft = this.session.draft(id);
    const accountGuid = this.workspace.account()?.guid;
    const recovery = this.session.recoveryDraft();
    if (this.session.pending() || recovery && recovery.id !== id) return;
    if (!draft || !accountGuid || draft.status === 'invalid') return;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'file', id, recovery ? 'review' : stepsForDraft(draft)[0].id]);
  }
}
