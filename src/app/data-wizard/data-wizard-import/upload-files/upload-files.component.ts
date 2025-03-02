import { Component } from '@angular/core';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { Subscription } from 'rxjs';
import { DataWizardService } from '../../data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

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
    private dataWizardService: DataWizardService,
    private accountDbService: AccountdbService
  ) {

  }

  ngOnInit() {
    this.fileReferencesSub = this.dataWizardService.fileReferences.subscribe(fileReferences => {
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
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {
            this.addFile(files[index]);
          }
        }
      }
    }
  }

  addFile(file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      try {
        console.log('try!')
        let fileReference: FileReference = this.uploadDataService.getFileReference(file, workBook, false);
        console.log(fileReference);
        this.fileReferences.push(fileReference);
        this.dataWizardService.fileReferences.next(this.fileReferences);
      } catch (err) {
        console.log(err);
        this.fileUploadError = true;
      }
    };
    reader.readAsBinaryString(file);
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
    this.dataWizardService.fileReferences.next(this.fileReferences);
  }

  setDragEnter() {
    this.dragOver = true;
  }

  setDragOut() {
    this.dragOver = false;
  }

  goBack() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-wizard/' + account.guid + '/account-setup');
  }

  next() {
    if (this.fileReferences.length > 0) {
      this.goToFile(this.fileReferences[0]);
    } else {
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/facilities');
    }
  }

  goToFile(fileReference: FileReference) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (fileReference.isTemplate) {
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-template-file/' + fileReference.id)
    } else {
      //todo
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-general-file/' + fileReference.id)
    }
  }
}
