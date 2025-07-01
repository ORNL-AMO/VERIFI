import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { DataManagementService } from '../../data-management.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-process-general-file',
  standalone: false,

  templateUrl: './process-general-file.component.html',
  styleUrl: './process-general-file.component.css'
})
export class ProcessGeneralFileComponent {

  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;

  selectedFile: FileReference;
  constructor(private activatedRoute: ActivatedRoute, private dataManagementService: DataManagementService,
    private router: Router,
    private accountDbService: AccountdbService
  ) {

  }

  ngOnInit() {
    this.fileReferenceSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });

    this.activatedRoute.params.subscribe(params => {
      let referenceId: string = params['id'];
      this.selectedFile = this.fileReferences.find(file => {
        return file.id == referenceId;
      });
      if (!this.selectedFile) {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        this.router.navigateByUrl('/data-management/' + account.guid + '/import-data');
      }
    });
  }

  ngOnDestroy() {
    this.fileReferenceSub.unsubscribe();
  }
}
