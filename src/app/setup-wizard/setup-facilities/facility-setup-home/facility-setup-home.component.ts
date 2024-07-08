import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { SetupWizardService } from '../../setup-wizard.service';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-setup-home',
  templateUrl: './facility-setup-home.component.html',
  styleUrl: './facility-setup-home.component.css'
})
export class FacilitySetupHomeComponent {


  dragOver: boolean = false;
  fileUploadError: string;
  numberOfFacilities: number = 4;
  facilitiesSub: Subscription;
  facilities: Array<IdbFacility>;
  constructor(private setupWizardService: SetupWizardService, private uploadDataService: UploadDataService,
    private toastNotificationService: ToastNotificationsService
  ) {
  }

  ngOnInit() {
    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
    });
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
  }

  addFacility() {
    this.setupWizardService.addFacility(this.numberOfFacilities);
  }

  setImportFile(event: EventTarget) {
    let files: FileList = (event as HTMLInputElement).files;
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {
            let file: File = files[index];
            const reader: FileReader = new FileReader();
            reader.onload = (e: any) => {
              const bstr: string = e.target.result;
              let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
              let isTemplate: "V1" | "V2" | "Non-template" = this.uploadDataService.checkSheetNamesForTemplate(workBook.SheetNames);
              if (isTemplate == "Non-template") {
                this.fileUploadError = 'File selected is not a VERIFI template. Please upload template file.'
              } else {
                try {
                  let fileReference: FileReference = this.uploadDataService.getFileReference(file, workBook, true);
                  this.fileUploadError = undefined;
                  this.setupWizardService.facilityTemplateWorkbook.next(workBook);
                } catch (err) {
                  console.log(err);
                  this.fileUploadError = 'No facilities found in template.'
                  this.toastNotificationService.showToast('An Error Occured!', "No facilities found in template. Facilities needed.", 10000, false, "alert-danger", false);
                }

              }
            };
            reader.readAsBinaryString(file);
          } else {
            this.fileUploadError = 'Invalid File Type.'
          }
        }
      }
    }
  }

  setDragEnter() {
    this.dragOver = true;
  }

  setDragOut() {
    this.dragOver = false;
  }
}
