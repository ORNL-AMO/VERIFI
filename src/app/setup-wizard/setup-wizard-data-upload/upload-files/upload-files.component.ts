import { Component } from '@angular/core';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { Subscription } from 'rxjs';
import { SetupWizardService } from '../../setup-wizard.service';

@Component({
  selector: 'app-upload-files',
  templateUrl: './upload-files.component.html',
  styleUrl: './upload-files.component.css'
})
export class UploadFilesComponent {

  fileUploadError: boolean;
  dragOver: boolean = false;
  filesUploaded: boolean = false;
  fileReferences: Array<FileReference>;
  fileReferencesSub: Subscription;
  constructor(private setupWizardService: SetupWizardService, private router: Router,
    private uploadDataService: UploadDataService,
    private toastNotificationService: ToastNotificationsService
  ) {

  }

  ngOnInit() {
    this.fileReferencesSub = this.setupWizardService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    })

    // this.facilitiesSub = this.setupWizardService.facilities.subscribe(facilities => {
    //   this.facilities = facilities;
    // });
  }

  ngOnDestroy() {
    // this.facilitiesSub.unsubscribe();
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
        let fileReference: FileReference = this.uploadDataService.getFileReference(file, workBook, true);
        this.fileReferences.push(fileReference);
        this.setupWizardService.fileReferences.next(this.fileReferences);
      } catch (err) {
        console.log(err);
        this.fileUploadError = true;
      }
    };
    reader.readAsBinaryString(file);
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
    this.setupWizardService.fileReferences.next(this.fileReferences);
  }

  // setImportFile(event: EventTarget) {
  //   let files: FileList = (event as HTMLInputElement).files;
  //   if (files) {
  //     if (files.length !== 0) {
  //       let regex3 = /.xlsx$/;
  //       for (let index = 0; index < files.length; index++) {
  //         if (regex3.test(files[index].name)) {
  //           let file: File = files[index];
  //           const reader: FileReader = new FileReader();
  //           reader.onload = (e: any) => {
  //             const bstr: string = e.target.result;
  //             let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
  //             let isTemplate: "V1" | "V2" | "Non-template" = this.uploadDataService.checkSheetNamesForTemplate(workBook.SheetNames);
  //             if (isTemplate == "Non-template") {
  //               this.fileUploadError = 'File selected is not a VERIFI template. Please upload template file.'
  //             } else {
  //               try {
  //                 let fileReference: FileReference = this.uploadDataService.getFileReference(file, workBook, true);
  //                 this.fileUploadError = undefined;
  //                 this.setupWizardService.facilityTemplateWorkbook.next(workBook);
  //                 this.setupWizardService.facilities.next(fileReference.importFacilities);
  //               } catch (err) {
  //                 console.log(err);
  //                 this.fileUploadError = 'No facilities found in template.'
  //                 this.toastNotificationService.showToast('An Error Occured!', "No facilities found in template. Facilities needed.", 10000, false, "alert-danger", false);
  //               }

  //             }
  //           };
  //           reader.readAsBinaryString(file);
  //         } else {
  //           this.fileUploadError = 'Invalid File Type.'
  //         }
  //       }
  //     }
  //   }
  // }

  setDragEnter() {
    this.dragOver = true;
  }

  setDragOut() {
    this.dragOver = false;
  }


  goToFacilities() {

  }
}
