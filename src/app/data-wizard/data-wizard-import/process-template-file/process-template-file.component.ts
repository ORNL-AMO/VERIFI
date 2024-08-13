import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { DataWizardService } from '../../data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-process-template-file',
  templateUrl: './process-template-file.component.html',
  styleUrl: './process-template-file.component.css'
})
export class ProcessTemplateFileComponent {

  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;

  selectedFile: FileReference;
  constructor(private activatedRoute: ActivatedRoute, private dataWizardService: DataWizardService,
    private router: Router,
    private accountDbService: AccountdbService
  ) {

  }

  ngOnInit() {
    this.fileReferenceSub = this.dataWizardService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });

    this.activatedRoute.params.subscribe(params => {
      let referenceId: string = params['id'];
      this.selectedFile = this.fileReferences.find(file => {
        return file.id == referenceId;
      });
      if (!this.selectedFile) {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        this.router.navigateByUrl('/data-wizard/' + account.guid);
      }
    });
  }

  ngOnDestroy() {
    this.fileReferenceSub.unsubscribe();
  }
}
