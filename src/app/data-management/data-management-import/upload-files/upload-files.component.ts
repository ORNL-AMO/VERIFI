import { Component } from '@angular/core';
import { UploadDataService } from 'src/app/data-management/data-management-import/import-services/upload-data.service';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
import { Subscription } from 'rxjs';
import { DataManagementService } from '../../data-management.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';

@Component({
  selector: 'app-upload-files',
  templateUrl: './upload-files.component.html',
  styleUrl: './upload-files.component.css',
  standalone: false
})
export class UploadFilesComponent {

  fileUploadError: boolean;
  dragOver: boolean = false;
  filesUploaded: boolean = false;
  fileReferences: Array<FileReference>;
  fileReferencesSub: Subscription;
  constructor(private router: Router,
    private uploadDataService: UploadDataService,
    private dataManagementService: DataManagementService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private importBackupModalService: ImportBackupModalService
  ) {

  }

  ngOnInit() {
    this.fileReferencesSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
  }

  ngOnDestroy() {
    this.fileReferencesSub.unsubscribe();
  }

  setImportFile(event: EventTarget) {
    let files: FileList = (event as HTMLInputElement).files;
    if (files) {
      if (files.length !== 0) {
        let regex3 =  /\.(xlsx|xls)$/i;
        this.loadingService.setLoadingMessage('Uploading Files...');
        this.loadingService.setLoadingStatus(true);
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {
            this.addFile(files[index]);
          }
        }
      }
    }
  }

  addFile(file: File) {
    console.log(file)
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      console.log('file read');
      const arrayBuffer: ArrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      let workBook: XLSX.WorkBook = XLSX.read(uint8Array, { type: 'array', cellDates: true });
      try {
        let fileReference: FileReference = this.uploadDataService.getFileReference(file, workBook);
        this.fileReferences.push(fileReference);
        this.dataManagementService.fileReferences.next(this.fileReferences);
        this.loadingService.setLoadingStatus(false);
      } catch (err) {
        console.log(err);
        this.fileUploadError = true;
        this.loadingService.setLoadingStatus(false);
      }
    };

    reader.onerror = (error) => {
      console.log('Error: ', error);
      this.fileUploadError = true;
      this.loadingService.setLoadingStatus(false);
    };
    reader.readAsArrayBuffer(file);
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
    this.dataManagementService.fileReferences.next(this.fileReferences);
  }

  setDragEnter() {
    this.dragOver = true;
  }

  setDragOut() {
    this.dragOver = false;
  }

  goBack() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + account.guid + '/account-setup');
  }

  next() {
    if (this.fileReferences.length > 0) {
      this.goToFile(this.fileReferences[0]);
    } else {
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.router.navigateByUrl('/data-management/' + account.guid + '/facilities');
    }
  }

  goToFile(fileReference: FileReference) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (fileReference.isTemplate) {
      this.router.navigateByUrl('/data-management/' + account.guid + '/import-data/process-template-file/' + fileReference.id)
    } else {
      this.router.navigateByUrl('/data-management/' + account.guid + '/import-data/process-general-file/' + fileReference.id)
    }
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }
}
