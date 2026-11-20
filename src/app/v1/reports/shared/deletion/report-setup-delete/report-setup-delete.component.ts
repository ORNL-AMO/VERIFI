import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, Injector, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { AccountReportActionsService } from '../../../account/account-report-actions.service';
import { FacilityReportActionsService } from '../../../facility/facility-report-actions.service';
import { ReportIdentity } from '../../report.models';
import { ReportWorkbenchController, ReportSession } from '../../workbench/report-workbench.controller';

interface DeletionSession {
  readonly target: ReportIdentity;
  readonly reportName: string;
  readonly ownerName: string;
  readonly reportSession: ReportSession;
  readonly releaseWorkbench: () => void;
}

/** One deletion workflow for every Setup runtime, including pending report formats. */
@Component({ selector: 'app-report-setup-delete', standalone: false,
  templateUrl: './report-setup-delete.component.html', styleUrls: ['./report-setup-delete.component.css'] })
export class ReportSetupDeleteComponent implements OnDestroy {
  private readonly workbench = inject(ReportWorkbenchController);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly route = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => parseWorkspaceRoute(event.urlAfterRedirects))
  ), { initialValue: parseWorkspaceRoute(this.router.url) });
  private readonly injector = inject(Injector);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('confirmation', { static: true }) private confirmation!: TemplateRef<unknown>;
  @ViewChild('deleteButton') private deleteButton?: ElementRef<HTMLButtonElement>;
  private portal?: TemplatePortal;
  private destroyed = false;
  private publicationReady = false;
  readonly session = signal<DeletionSession | undefined>(undefined);
  readonly busy = signal(false);
  readonly committed = signal(false);
  readonly error = signal('');
  readonly workspaceUnavailable = computed(() => !this.workspace.canWrite() || this.workspace.hasPending());
  readonly canDelete = computed(() => !!this.workbench.host.identity() && this.workspace.canWrite()
    && !!this.workbench.session() && !this.session() && !this.modal.activePortal());

  constructor() {
    const unregister = inject(UnsavedChangesService).registerNavigationPreflight(async () => !this.session() || this.publicationReady);
    inject(DestroyRef).onDestroy(unregister);
    effect(() => {
      // Track route/session and owner changes even when the record disappears on publication.
      this.workbench.host.identity(); this.workspace.account(); this.workspace.selectedFacility();
      const session = this.session();
      if (session && !this.isCurrent(session)) this.release(this.committed());
    });
  }

  async request(): Promise<void> {
    const target = this.workbench.host.identity(), reportSession = this.workbench.session();
    if (!target || !reportSession || !this.canDelete()) return;
    const names = this.savedNames(target);
    if (!names) return;
    const session: DeletionSession = { target, reportSession, ...names, releaseWorkbench: this.workbench.retainForDeletion() };
    this.session.set(session); this.busy.set(true); this.error.set('');
    this.committed.set(false); this.publicationReady = false;
    const ready = await reportSession.runtime.editor.beginDeletion();
    if (!this.isCurrent(session)) return;
    if (!ready || this.modal.activePortal()) { this.release(false); return; }
    // A submitted save may have changed the durable report name while we drained it.
    const latest = this.savedNames(target);
    if (!latest) { this.release(false); return; }
    this.session.set({ ...session, ...latest });
    this.busy.set(false);
    this.portal = new TemplatePortal(this.confirmation, this.container);
    this.modal.show(this.portal, { blockWorkspace: true });
  }

  cancel(): void {
    if (this.busy() || this.committed()) return;
    this.release(false);
  }

  async confirm(): Promise<void> {
    const session = this.session();
    if (!session || !this.isCurrent(session) || this.busy() || (!this.committed() && this.workspaceUnavailable())) return;
    this.busy.set(true); this.error.set('');
    try {
      if (this.committed()) {
        if (!this.publicationReady) await this.injector.get(WorkspaceCommandBoundary).recoverCommittedPublication(session.target.accountGuid);
      } else if (session.target.scope === 'account') {
        await this.injector.get(AccountReportActionsService).delete(session.target.reportGuid);
      } else {
        await this.injector.get(FacilityReportActionsService).delete(session.target.facilityGuid, session.target.reportGuid);
      }
      if (!this.isCurrent(session)) return;
      this.committed.set(true); this.publicationReady = true;
      session.reportSession.runtime.editor.completeDeletion();
      const navigation = this.injector.get(WorkspaceNavigationService);
      const destination = session.target.scope === 'facility'
        ? navigation.facilityInventoryLink(session.target.facilityGuid, 'reports')
        : { route: navigation.accountReportsRoute(session.target.accountGuid), queryParams: {} };
      const navigated = await this.router.navigate([...destination.route], { queryParams: destination.queryParams ?? {}, replaceUrl: true });
      if (!this.isCurrent(session)) return;
      if (navigated) this.release(true);
      else this.error.set('The report was deleted. Try returning to Reports again.');
    } catch (error) {
      if (!this.isCurrent(session)) return;
      if (error instanceof WorkspaceWriteError && error.persistenceCommitted) this.committed.set(true);
      this.error.set(this.committed()
        ? this.publicationReady ? 'The report was deleted. Try returning to Reports again.' : 'The report was deleted. Refresh the saved changes to return to Reports.'
        : error instanceof Error ? error.message : 'The report could not be deleted. Try again.');
    } finally {
      if (this.isCurrent(session)) this.busy.set(false);
    }
  }

  ngOnDestroy(): void { this.destroyed = true; this.release(this.committed()); }

  private savedNames(target: ReportIdentity): { reportName: string; ownerName: string } | undefined {
    const report = target.scope === 'account'
      ? this.workspace.accountReports().find(item => item.accountId === target.accountGuid && item.guid === target.reportGuid)
      : this.workspace.facilityReports().find(item => item.accountId === target.accountGuid && item.facilityId === target.facilityGuid && item.guid === target.reportGuid);
    const owner = target.scope === 'account' ? this.workspace.account()
      : this.workspace.facilities().find(item => item.accountId === target.accountGuid && item.guid === target.facilityGuid);
    return report && owner ? { reportName: report.name || 'Untitled report', ownerName: owner.name || (target.scope === 'account' ? 'Account' : 'Facility') } : undefined;
  }

  private isCurrent(session: DeletionSession): boolean {
    const route = this.route(), target = session.target;
    return !this.destroyed && this.session() === session && this.workbench.session() === session.reportSession
      && this.workspace.account()?.guid === target.accountGuid && route.reportGuid === target.reportGuid
      && (target.scope === 'account' ? route.accountGuid === target.accountGuid
        : route.facilityGuid === target.facilityGuid && this.workspace.selectedFacility()?.guid === target.facilityGuid);
  }

  private release(completed: boolean): void {
    const session = this.session(); this.session.set(undefined);
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
    if (session) {
      if (completed) session.reportSession.runtime.editor.completeDeletion();
      else session.reportSession.runtime.editor.cancelDeletion();
      session.releaseWorkbench();
    }
    this.busy.set(false);
    if (!completed && !this.destroyed && session?.target.accountGuid === this.workspace.account()?.guid) {
      afterNextRender(() => {
        if (!this.destroyed && !this.modal.activePortal()) this.deleteButton?.nativeElement.focus();
      }, { injector: this.injector });
    }
  }
}
