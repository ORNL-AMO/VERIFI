import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, Injector, afterNextRender, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ManualBackupDownloadService, ManualBackupRequest } from '@app/v1/shared/backup/manual-backup-download.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-backup',
  templateUrl: './facility-settings-backup.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsBackupComponent extends FacilitySettingsDetailBase {
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private backupOpener?: HTMLElement;

  @ViewChild('backupConfirmModal') private readonly backupConfirmModal!: TemplateRef<unknown>;

  showBackupConfirm = false;
  showImportPanel = false;
  readonly backups = inject(ManualBackupDownloadService);
  backupRequest: ManualBackupRequest | null = null;
  backupName = '';

  readonly isBackingUp = this.backups.preparing;

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.showBackupConfirm = false;
    this.modalPortal.hide();
  }

  openBackupConfirm(): void {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.backups.available()) return;
    this.backupRequest = { scope: 'facility', accountGuid: account.guid, facilityGuid: facility.guid, format: 'json' };
    this.backupName = facility.name;
    this.backupOpener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.showBackupConfirm = true;
    this.modalPortal.show(new TemplatePortal(this.backupConfirmModal, this.viewContainerRef));
  }

  cancelBackupConfirm(): void {
    this.showBackupConfirm = false;
    this.backupRequest = null;
    this.modalPortal.hide();
  }

  async confirmBackupDownload(): Promise<void> {
    const request = this.backupRequest;
    if (!request || !this.backups.available()) return;
    this.cancelBackupConfirm();
    await this.backups.download(request);
    if (this.destroyRef.destroyed) return;
    const opener = this.backupOpener;
    afterNextRender(() => { if (opener?.isConnected) opener.focus(); }, { injector: this.injector });
  }

  openImportPanel(): void {
    this.showImportPanel = true;
    this.saveError = '';
  }

  closeImportPanel(): void {
    this.showImportPanel = false;
  }

  openImportedFacility(facility: IdbFacility): void {
    this.closeImportPanel();
    this.navigation.setFacility(facility.guid);
  }
}
