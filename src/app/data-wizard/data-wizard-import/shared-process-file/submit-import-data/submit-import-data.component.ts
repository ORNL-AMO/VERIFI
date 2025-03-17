import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { FileReference } from 'src/app/upload-data/upload-data-models';

@Component({
  selector: 'app-submit-import-data',
  standalone: false,

  templateUrl: './submit-import-data.component.html',
  styleUrl: './submit-import-data.component.css'
})
export class SubmitImportDataComponent {
  fileReference: FileReference;
  paramsSub: Subscription;

  constructor(private router: Router, private accountDbService: AccountdbService,
    private activatedRoute: ActivatedRoute,
    private dataWizardService: DataWizardService
  ) { }


  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  goBack() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (this.fileReference.isTemplate) {
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-template-file/' + this.fileReference.id + '/meter-readings');
    } else {
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-general-file/' + this.fileReference.id + '/predictor-data');
    }
  }

  next() {

  }
}
