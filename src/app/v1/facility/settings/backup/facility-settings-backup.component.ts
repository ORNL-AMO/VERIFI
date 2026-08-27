import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-backup',
  templateUrl: './facility-settings-backup.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsBackupComponent extends FacilitySettingsDetailBase {
  private readonly backupExportCoordinator = inject(BackupExportCoordinator);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('backupConfirmModal') private readonly backupConfirmModal!: TemplateRef<unknown>;

  showBackupConfirm = false;
  showImportPanel = false;
  isBackingUp = false;

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.showBackupConfirm = false;
    this.modalPortal.hide();
  }

  openBackupConfirm(): void {
    if (!this.facility() || this.isBackingUp) {
      return;
    }
    this.showBackupConfirm = true;
    this.saveError = '';
    this.modalPortal.show(new TemplatePortal(this.backupConfirmModal, this.viewContainerRef));
  }

  cancelBackupConfirm(): void {
    if (!this.isBackingUp) {
      this.showBackupConfirm = false;
      this.modalPortal.hide();
    }
  }

  async confirmBackupDownload(): Promise<void> {
    const facility = this.facility();
    if (!facility || this.isBackingUp) {
      return;
    }
    this.showBackupConfirm = false;
    this.modalPortal.hide();
    this.isBackingUp = true;
    await this.runSave('Preparing facility backup', async () => {
      await this.backupExportCoordinator.exportFacility(facility.guid);
    });
    this.isBackingUp = false;
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
