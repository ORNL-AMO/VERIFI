import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AutomaticBackupsService } from './automatic-backups.service';
import { ElectronService } from './electron.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { ElectronUpdateState } from './electron-update.models';

@Injectable({ providedIn: 'root' })
export class UpdateInstallService implements OnDestroy {
  private pending?: Promise<boolean>;
  private readonly writableInstallationPending = signal(false);
  readonly installationPending = this.writableInstallationPending.asReadonly();
  private readonly installationStatus: Subscription;
  private preparingInstallation = false;

  constructor(
    private readonly router: Router,
    private readonly commands: WorkspaceCommandBoundary,
    private readonly backups: AutomaticBackupsService,
    private readonly electron: ElectronService,
    private readonly loading: LoadingService,
    private readonly lifecycle: ApplicationLifecycleService
  ) {
    this.installationStatus = this.electron.updateState.subscribe(state => {
      if (state.status === 'installing') this.writableInstallationPending.set(true);
      else if (!this.preparingInstallation && this.installationFailed(state)) this.writableInstallationPending.set(false);
    });
  }

  install(): Promise<boolean> {
    if (!this.pending) {
      this.pending = this.prepare().finally(() => { this.pending = undefined; });
    }
    return this.pending;
  }

  private async prepare(): Promise<boolean> {
    if (!this.electron.isElectron || this.electron.updateState.value.status !== 'downloaded') return false;
    const startup = await this.lifecycle.initialize();
    if (startup.status !== 'ready' && startup.status !== 'empty') {
      throw new Error('Resolve the application startup issue before restarting to install the update.');
    }
    // Real navigation runs the existing editor leave guards, including Save/Discard/Cancel.
    if (this.router.url !== '/welcome' && !await this.router.navigateByUrl('/welcome')) return false;
    this.preparingInstallation = true;
    this.writableInstallationPending.set(true);
    this.loading.setLoadingMessage('Finishing saves and backups before restarting…');
    this.loading.setLoadingStatus(true);
    let accepted = false;
    let requestedFrom: ElectronUpdateState | undefined;
    try {
      do {
        await this.commands.whenIdle();
        await this.backups.flushPending();
      } while (this.commands.hasPendingCommands || this.commands.hasUnresolvedFailures || this.backups.hasPendingOperations);
      if (this.electron.updateState.value.status !== 'downloaded') return false;
      // Native installers (especially Squirrel on macOS) may fetch asynchronously before quitting.
      requestedFrom = this.electron.updateState.value;
      accepted = await this.electron.installUpdate();
      const afterRequest = this.electron.updateState.getValue();
      if (!accepted && afterRequest.status !== 'installing') {
        throw new Error(afterRequest.message || 'VERIFI could not start the update. Try restarting again.');
      }
      return accepted;
    } finally {
      this.preparingInstallation = false;
      const state = this.electron.updateState.value;
      if ((!accepted && state.status !== 'installing') || (state !== requestedFrom && this.installationFailed(state))) {
        this.writableInstallationPending.set(false);
      }
      this.loading.setLoadingStatus(false);
      this.loading.setLoadingMessage(undefined);
    }
  }

  private installationFailed(state: ElectronUpdateState): boolean {
    return state.status === 'error' || state.status === 'unsupported' || (state.status === 'downloaded' && Boolean(state.message));
  }

  ngOnDestroy(): void {
    this.installationStatus.unsubscribe();
    this.writableInstallationPending.set(false);
  }
}
