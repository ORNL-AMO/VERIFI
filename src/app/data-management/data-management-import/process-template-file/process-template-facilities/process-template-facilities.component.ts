import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { FileReference, getEmptyFileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';

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

  constructor(private activatedRoute: ActivatedRoute, private dataManagementService: DataManagementService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }
}
