import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { FACILITY_DELETION_MESSAGES } from 'src/app/indexedDB/facility-deletion.config';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-facility-settings',
    templateUrl: './facility-settings.component.html',
    styleUrls: ['./facility-settings.component.css'],
    standalone: false
})
export class FacilitySettingsComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  showDeleteFacility: boolean = false;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  loadingSub: Subscription;
  constructor(
    private router: Router,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private commandBoundary: WorkspaceCommandBoundary,
    private facilityHandler: FacilityCommandHandler,
    private injector: Injector

  ) { }

  ngOnInit() {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'delete-facility') {
        this.showFacilityDeletionToast();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  showFacilityDeletionToast() {
    this.toastNotificationService.showToast('Facility Deleted!', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/data-evaluation/account');
  }

  async facilityDelete() {
    const selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    for (const message of FACILITY_DELETION_MESSAGES) {
      this.loadingService.addLoadingMessage(message);
    }
    this.loadingService.setContext('delete-facility');
    this.loadingService.setTitle('Deleting Facility');
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'delete', entityGuid: this.selectedFacility.guid, label: 'Deleting facility' },
      () => this.facilityHandler.delete(this.selectedFacility, selectedAccount.guid, phase => {
        this.loadingService.setCurrentLoadingIndex(phase.index);
      })
    );
    this.loadingService.isLoadingComplete.next(true);
  }

  openDeleteFacility() {
    this.showDeleteFacility = true;
  }

  async confirmDelete() {
    this.showDeleteFacility = undefined;
    await this.facilityDelete();
  }

  cancelDelete() {
    this.showDeleteFacility = undefined;
  }

  backupFacility() {
    this.backupDataService.backupFacility(this.selectedFacility);
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = true;
    this.importBackupModalService.showModal.next(true);
  }

}


