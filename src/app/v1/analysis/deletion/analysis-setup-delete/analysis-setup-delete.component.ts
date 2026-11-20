import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, Injector, OnDestroy, afterNextRender, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AccountAnalysisActionsService } from '@app/v1/analysis/account/account-analysis-actions.service';
import { FacilityAnalysisActionsService } from '@app/v1/analysis/facility/facility-analysis-actions.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisDeletionPreview, AnalysisDeletionScope, analysisDeletionPreview } from '../analysis-deletion';

export interface AnalysisDeletionEditor {
  beginDeletion(): Promise<boolean>;
  cancelDeletion(): void;
  completeDeletion(): void;
}

interface DeletionSession {
  readonly target: AnalysisDeletionPreview;
  readonly editor: AnalysisDeletionEditor;
}

@Component({
  selector: 'app-analysis-setup-delete',
  standalone: true,
  imports: [ConfirmationDialogComponent, IconComponent],
  templateUrl: './analysis-setup-delete.component.html',
  styleUrls: ['./analysis-setup-delete.component.css']
})
export class AnalysisSetupDeleteComponent implements OnDestroy {
  @ViewChild('deleteButton') private deleteButton?: ElementRef<HTMLButtonElement>;
  private readonly injector = inject(Injector);
  @ViewChild('confirmation', { static: true }) private confirmation!: TemplateRef<unknown>;
  readonly scope = input.required<AnalysisDeletionScope>();
  readonly analysisGuid = input.required<string>();
  readonly autosave = input.required<AnalysisDeletionEditor>();
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly accountActions = inject(AccountAnalysisActionsService);
  private readonly facilityActions = inject(FacilityAnalysisActionsService);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private portal?: TemplatePortal;
  private destroyed = false;
  readonly session = signal<DeletionSession | undefined>(undefined);
  readonly busy = signal(false);
  readonly committed = signal(false);
  private readonly publicationReady = signal(false);
  readonly error = signal('');
  readonly preview = computed(() => {
    const preview = analysisDeletionPreview(this.workspace.snapshot(), this.scope(), this.analysisGuid());
    return preview?.scope === 'facility' && preview.facilityGuid !== this.workspace.selectedFacility()?.guid
      ? undefined : preview;
  });
  readonly blockedReason = computed(() => this.preview()?.blockedReason ?? 'This analysis is no longer available.');
  readonly workspaceUnavailable = computed(() => !this.workspace.canWrite() || this.workspace.hasPending());
  readonly canDelete = computed(() => !!this.preview() && this.workspace.canWrite() && !this.session() && !this.modal.activePortal());

  constructor() {
    const unregister = inject(UnsavedChangesService).registerNavigationPreflight(async () => !this.session() || this.publicationReady());
    inject(DestroyRef).onDestroy(unregister);
    effect(() => {
      const session = this.session();
      if (session && (session.target.accountGuid !== this.workspace.account()?.guid
        || session.target.analysisGuid !== this.analysisGuid() || session.target.scope !== this.scope()
        || session.editor !== this.autosave()
        || (session.target.scope === 'facility' && session.target.facilityGuid !== this.workspace.selectedFacility()?.guid))) this.release(this.committed());
    });
  }

  async requestDelete(): Promise<void> {
    const target = this.preview();
    if (!target || !this.canDelete()) return;
    const session = { target, editor: this.autosave() };
    this.session.set(session);
    this.busy.set(true);
    this.error.set('');
    this.committed.set(false);
    this.publicationReady.set(false);
    const ready = await session.editor.beginDeletion();
    if (!this.isCurrent(session)) return;
    this.busy.set(false);
    if (!ready) { this.release(false); return; }
    // Resolve the saved name and dependencies again after an already-submitted save settles.
    const current = this.preview();
    if (!current || this.modal.activePortal()) { this.release(false); return; }
    this.session.set({ ...session, target: current });
    this.portal = new TemplatePortal(this.confirmation, this.container);
    this.modal.show(this.portal, { blockWorkspace: true });
  }

  cancel(): void {
    if (this.busy() || this.committed()) return;
    this.release(false);
  }

  async confirmDelete(): Promise<void> {
    const session = this.session();
    if (!session || this.busy() || (!this.committed() && (this.blockedReason() || !this.workspace.canWrite() || this.workspace.hasPending()))) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.committed()) {
        if (!this.publicationReady()) await this.boundary.recoverCommittedPublication(session.target.accountGuid);
      } else if (session.target.scope === 'account') {
        await this.accountActions.deleteAnalysis(session.target.analysisGuid);
      } else {
        await this.facilityActions.deleteAnalysis(session.target.analysisGuid, session.target.facilityGuid);
      }
      if (!this.isCurrent(session)) return;
      this.committed.set(true);
      this.publicationReady.set(true);
      // Drop the hold and draft only after committed data has published, so route guards can leave.
      session.editor.completeDeletion();
      const destination = session.target.scope === 'facility'
        ? this.navigation.facilityInventoryLink(session.target.facilityGuid!, 'analysis')
        : { route: this.navigation.accountAnalysisRoute(session.target.accountGuid), queryParams: {} };
      const navigated = await this.router.navigate(destination.route, { queryParams: destination.queryParams, replaceUrl: true });
      if (!this.isCurrent(session)) return;
      if (navigated) { this.release(true); }
      else { this.showNavigationError(); }
    } catch (error) {
      if (!this.isCurrent(session)) return;
      if (error instanceof WorkspaceWriteError && error.persistenceCommitted) this.committed.set(true);
      this.error.set(this.committed()
        ? 'The analysis was deleted. Refresh the saved changes to return to Analysis.'
        : error instanceof Error ? error.message : 'The analysis could not be deleted. Try again.');
      if (this.portal && (!this.modal.activePortal() || this.modal.activePortal() === this.portal)) {
        this.modal.show(this.portal, { blockWorkspace: true });
      }
    } finally {
      if (this.isCurrent(session)) this.busy.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.release(this.committed());
  }

  private isCurrent(session: DeletionSession): boolean {
    return !this.destroyed && this.session() === session
      && this.workspace.account()?.guid === session.target.accountGuid
      && this.analysisGuid() === session.target.analysisGuid && this.scope() === session.target.scope
      && this.autosave() === session.editor
      && (session.target.scope !== 'facility' || this.workspace.selectedFacility()?.guid === session.target.facilityGuid);
  }

  private showNavigationError(): void {
    this.error.set('The analysis was deleted. Try returning to Analysis again.');
    if (this.portal && (!this.modal.activePortal() || this.modal.activePortal() === this.portal)) {
      this.modal.show(this.portal, { blockWorkspace: true });
    }
  }

  private release(completed: boolean): void {
    const session = this.session();
    this.session.set(undefined);
    this.hideOwnedPortal();
    if (session) {
      if (completed) session.editor.completeDeletion();
      else session.editor.cancelDeletion();
    }
    this.busy.set(false);
    if (!completed && !this.destroyed && session?.target.accountGuid === this.workspace.account()?.guid
      && session?.target.analysisGuid === this.analysisGuid()) {
      // The opener was disabled during preparation, before the portal could capture focus.
      afterNextRender(() => {
        if (!this.destroyed && !this.modal.activePortal()) this.deleteButton?.nativeElement.focus();
      }, { injector: this.injector });
    }
  }

  private hideOwnedPortal(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
  }
}
