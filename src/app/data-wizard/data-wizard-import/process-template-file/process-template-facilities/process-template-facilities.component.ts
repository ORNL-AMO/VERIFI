import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotification, ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { DataWizardImportNavigationService } from '../../data-wizard-import-navigation.service';

@Component({
  selector: 'app-process-template-facilities',
  templateUrl: './process-template-facilities.component.html',
  styleUrl: './process-template-facilities.component.css',
  standalone: false
})
export class ProcessTemplateFacilitiesComponent {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;

  account: IdbAccount;

  constructor(private activatedRoute: ActivatedRoute, private dataWizardService: DataWizardService,
    private facilityDbService: FacilitydbService, private router: Router,
    private loadingService: LoadingService,
    private accountDbService: AccountdbService,
    private dataWizardImportNavigationService: DataWizardImportNavigationService) { }

  ngOnInit(): void {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  goBack() {
    this.dataWizardImportNavigationService.goToPage('upload-files', this.fileReference);
  }

  next() {
    // this.dataWizardImportNavigationService.goToPage('meters', this.fileReference)
    // this.router.navigateByUrl('/data-wizard/' + this.account.guid + '/import-data/process-template-file/' + this.fileReference.id + '/meters');
  }
}
