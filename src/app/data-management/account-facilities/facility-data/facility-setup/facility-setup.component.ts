import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';

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
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService,
    private dbChangesService: DbChangesService,
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
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    this.dbChangesService.deleteFacilityMessages();
    await this.dbChangesService.deleteFacility(this.selectedFacility, selectedAccount);
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

  backupFacility() {
    this.backupDataService.backupFacility(this.selectedFacility);
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = true;
    this.importBackupModalService.showModal.next(true);
  }
}
