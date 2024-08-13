import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotification, ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';

@Component({
  selector: 'app-process-template-facilities',
  templateUrl: './process-template-facilities.component.html',
  styleUrl: './process-template-facilities.component.css'
})
export class ProcessTemplateFacilitiesComponent {

  fileReference: FileReference = getEmptyFileReference();
  constructor(private activatedRoute: ActivatedRoute, private dataWizardService: DataWizardService,
    private facilityDbService: FacilitydbService, private router: Router,
    private loadingService: LoadingService,
    private accountDbService: AccountdbService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
    });
  }

  ngOnDestroy() {
    // this.paramsSub.unsubscribe();
  }


  async submitFacilities() {
    this.loadingService.setLoadingMessage('Uploading Facilities..');
    for (let i = 0; i < this.fileReference.importFacilities.length; i++) {
      if (this.fileReference.importFacilities[i].id) {
        await firstValueFrom(this.facilityDbService.updateWithObservable(this.fileReference.importFacilities[i]));
      } else {
        this.fileReference.importFacilities[i] = await firstValueFrom(this.facilityDbService.addWithObservable(this.fileReference.importFacilities[i]));
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(account, false);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Account Facilities Updated', undefined, undefined, false, 'alert-success', false);
  }

  goBack() {

  }

  next() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-template-file/' + this.fileReference.id + '/meters');
  }
}
