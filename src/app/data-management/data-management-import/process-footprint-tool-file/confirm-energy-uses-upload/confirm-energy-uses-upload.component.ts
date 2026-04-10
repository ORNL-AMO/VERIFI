import { Component } from '@angular/core';
import { FileReference } from '../../import-services/upload-data-models';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { UploadDataService } from '../../import-services/upload-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-confirm-energy-uses-upload',
  standalone: false,
  templateUrl: './confirm-energy-uses-upload.component.html',
  styleUrl: './confirm-energy-uses-upload.component.css',
})
export class ConfirmEnergyUsesUploadComponent {
  fileReference: FileReference;
  paramsSub: Subscription;
  navSub: Subscription;

  dataSubmitted: boolean = false;
  constructor(
    private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private uploadDataService: UploadDataService,
    private router: Router,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService
  ) { }


  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
    });

    this.navSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context == 'submit-file-data') {
        this.uploadDataService.navigate();
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        this.router.navigateByUrl('/data-management/' + account.guid + '/import-data');
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
    this.navSub?.unsubscribe();
  }

  async submitImport() {
    if (!this.dataSubmitted) {
      this.fileReference = await this.uploadDataService.submit(this.fileReference);
      this.finishSubmit();
    } else {
      this.finishSubmit();
    }
  }

  finishSubmit() {
    let fileReferences: Array<FileReference> = this.dataManagementService.fileReferences.getValue();
    fileReferences = fileReferences.filter(fileRef => { return fileRef.id != this.fileReference.id });
    this.dataManagementService.fileReferences.next(fileReferences);
  }

}
