import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

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
        let account: IdbAccount = this.accountWorkspaceStore.account();
        this.router.navigateByUrl('/data-management/' + account.guid + '/import-data');
      }
    });
  }

  ngOnDestroy() {
    this.fileReferenceSub.unsubscribe();
  }
}
