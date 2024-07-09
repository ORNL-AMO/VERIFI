import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { SetupWizardService } from '../setup-wizard.service';
import * as XLSX from 'xlsx';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';

@Component({
  selector: 'app-setup-facilities',
  templateUrl: './setup-facilities.component.html',
  styleUrls: ['./setup-facilities.component.css']
})
export class SetupFacilitiesComponent implements OnInit {

  facilitiesSub: Subscription;
  facilities: Array<IdbFacility>;
  modalOpen: boolean;
  modalOpenSub: Subscription;

  fileUploadError: string;
  templateSub: Subscription;
  dragOver: boolean = false;

  numberOfFacilities: number = 4;
  orderOptions: Array<number> = [];
  facilityToDelete: IdbFacility;
  displayAddFacilityModal: boolean = false;
  constructor(private setupWizardService: SetupWizardService, private sharedDataService: SharedDataService,
    private router: Router,
    private uploadDataService: UploadDataService,
    private toastNotificationService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
      this.setOrderOptions();
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }

  addFacility() {
    this.setupWizardService.addFacility(this.numberOfFacilities);
    this.cancelAddFacilities();
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
                  this.setupWizardService.facilities.next(fileReference.importFacilities);
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

  resetOption() {
    this.setupWizardService.facilityTemplateWorkbook.next(undefined);
  }

  setDragEnter() {
    this.dragOver = true;
  }

  setDragOut() {
    this.dragOver = false;
  }

  goBack() {

  }

  next() {

  }

  openAddFacilityModal() {
    this.displayAddFacilityModal = true;
  }

  cancelAddFacilities() {
    this.displayAddFacilityModal = false;
  }

  setDeleteFacility(facility: IdbFacility) {
    this.facilityToDelete = facility;
  }

  cancelFacilityDelete() {
    this.facilityToDelete = undefined;
  }

  confirmDeleteFacility() {
    this.facilities = this.facilities.filter(facility => {
      return facility.guid != this.facilityToDelete.guid
    });
    this.setupWizardService.facilities.next(this.facilities);
    this.cancelFacilityDelete();
  }

  goToFacility(facility: IdbFacility) {
    this.router.navigateByUrl('/setup-wizard/facility-details/' + facility.guid);
  }

  setOrderOptions() {
    let orderOptions: Array<number> = new Array();
    let index: number = 1;
    this.facilities.forEach(item => {
      orderOptions.push(index);
      index++;
    })
    this.orderOptions = orderOptions;
  }

  setFacilityOrder(facility: IdbFacility) {
    for (let i = 0; i < this.facilities.length; i++) {
      if (this.facilities[i].guid != facility.guid) {
        if (this.facilities[i].facilityOrder && this.facilities[i].facilityOrder == facility.facilityOrder) {
          this.facilities[i].facilityOrder = undefined;
        }
      }
    };
    this.setupWizardService.facilities.next(this.facilities);
  }
  goToUploadData() {
    this.router.navigateByUrl('/setup-wizard/data-upload');
  }
}
