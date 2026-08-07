import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { FACILITY_DELETION_MESSAGES } from 'src/app/indexedDB/facility-deletion.config';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { BackupExportCoordinator } from 'src/app/backup/backup-export-coordinator.service';

@Component({
  selector: 'app-facility-setup',
  templateUrl: './facility-setup.component.html',
  styleUrl: './facility-setup.component.css',
  standalone: false
})
export class FacilitySetupComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


  showDeleteFacility: boolean = false;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(
    private router: Router,
    private backupExportCoordinator: BackupExportCoordinator,
    private importBackupModalService: ImportBackupModalService,
    private loadingService: LoadingService,
    private commandBoundary: WorkspaceCommandBoundary,
    private facilityHandler: FacilityCommandHandler,
    private injector: Injector

  ) { }

  ngOnInit() {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
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
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/facilities');
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

  async backupFacility() {
    await this.backupExportCoordinator.exportFacility(this.selectedFacility.guid);
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = true;
    this.importBackupModalService.showModal.next(true);
  }
}
