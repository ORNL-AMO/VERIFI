import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronService } from '@platform/electron/electron.service';
import { ElectronUpdateState } from '@platform/electron/electron-update.models';
import { UpdateInstallService } from '@platform/electron/update-install.service';

@Component({
  selector: 'app-electron-update',
  templateUrl: './electron-update.component.html',
  styleUrls: ['./electron-update.component.css'],
  standalone: false
})
export class ElectronUpdateComponent implements OnInit, OnDestroy {
  state: ElectronUpdateState = { status: 'idle' };
  visible = false;
  preparing = false;
  restartError?: string;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly electron: ElectronService,
    private readonly installer: UpdateInstallService,
    private readonly cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(this.electron.updateState.subscribe(state => {
      if (state.status !== this.state.status && ['available', 'downloaded', 'error', 'unsupported'].includes(state.status)) this.visible = true;
      this.state = state;
      this.cd.markForCheck();
    }));
    this.subscriptions.add(this.electron.updateRequested.subscribe(request => {
      if (request > 0) this.visible = true;
      this.cd.markForCheck();
    }));
    this.electron.sendAppReady('ready');
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
  download(): void { this.electron.sendUpdateSignal(); }
  retry(): void { this.electron.retryUpdate(); }

  async restart(): Promise<void> {
    if (this.preparing) return;
    this.preparing = true;
    this.restartError = undefined;
    try {
      await this.installer.install();
    } catch (error) {
      this.restartError = error instanceof Error ? error.message : 'VERIFI could not prepare to restart. Try again.';
    } finally {
      this.preparing = false;
      this.cd.markForCheck();
    }
  }
}
