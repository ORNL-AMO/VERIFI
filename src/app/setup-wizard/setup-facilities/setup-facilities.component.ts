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

  // generalInformationInvalid: boolean;
  // unitsInvalid: boolean;
  // reportingInvalid: boolean;
  // missingEmissions: boolean;
  // missingEnergyReductionGoal: boolean;

  fileUploadError: string;
  templateSub: Subscription;
  hasTemplate: boolean;
  // unitsClass: 'bg-danger' | 'bg-success' | 'bg-warning';
  // reportingClass: 'bg-danger' | 'bg-success' | 'bg-warning';
  dragOver: boolean = false;

  numberOfFacilities: number = 4;
  orderOptions: Array<number> = [];
  facilityToDelete: IdbFacility;
  displayAddFacilityModal: boolean = false;
  constructor(private setupWizardService: SetupWizardService, private sharedDataService: SharedDataService,
    private router: Router, private settingsFormService: SettingsFormsService,
    private uploadDataService: UploadDataService,
    private cd: ChangeDetectorRef,
    private toastNotificationService: ToastNotificationsService) { }

  ngOnInit(): void {
    // this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(val => {
    //   this.selectedFacility = val;
    //   if (this.selectedFacility) {
    //     this.setValidation(this.selectedFacility);
    //     this.setUnitsClass();
    //     this.setReportsClass();
    //   } else {
    //     this.setupWizardService.canContinue.next(false);
    //   }
    // });

    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.templateSub = this.setupWizardService.facilityTemplateWorkbook.subscribe(workbook => {
      this.hasTemplate = (workbook != undefined);
      if (this.hasTemplate) {
        this.setupWizardService.canContinue.next(true);
      } else if (this.facilities.length == 0) {
        this.setupWizardService.canContinue.next(false);
      }
    })
  }

  ngOnDestroy() {
    // this.selectedFacilitySub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.templateSub.unsubscribe();
  }

  addFacility() {
    this.setupWizardService.addFacility(this.numberOfFacilities);
    this.cancelAddFacilities();
  }

  // selectFacility(facility: IdbFacility) {
  //   this.setupWizardService.selectedFacility.next(facility);
  //   this.router.navigateByUrl('setup-wizard/facility-setup/information-setup');
  // }

  // deleteFacility() {
  //   this.facilities = this.facilities.filter(facility => { return facility.wizardId != this.selectedFacility.wizardId });
  //   this.setupWizardService.selectedFacility.next(this.facilities[0]);
  //   this.setupWizardService.facilities.next(this.facilities);
  //   this.router.navigateByUrl('setup-wizard/facility-setup/information-setup');
  // }

  // setValidation(facility: IdbFacility) {
  //   this.unitsInvalid = this.settingsFormService.getUnitsForm(facility).invalid;
  //   this.reportingInvalid = this.settingsFormService.getSustainabilityQuestionsForm(facility).invalid;
  //   this.generalInformationInvalid = this.settingsFormService.getGeneralInformationForm(facility).invalid;
  //   this.missingEmissions = !facility.eGridSubregion;
  //   this.missingEnergyReductionGoal = !facility.sustainabilityQuestions.energyReductionGoal;
  //   if (this.router.url.includes('information-setup')) {
  //     this.setupWizardService.canContinue.next(!this.generalInformationInvalid);
  //   } else if (this.router.url.includes('units-setup')) {
  //     this.setupWizardService.canContinue.next(!this.unitsInvalid);
  //   } else if (this.router.url.includes('reporting-setup')) {
  //     this.setupWizardService.canContinue.next(!this.reportingInvalid);
  //   }
  // }


  // setUnitsClass() {
  //   let badgeClass: 'bg-danger' | 'bg-success' | 'bg-warning' = 'bg-success';
  //   if (this.unitsInvalid) {
  //     badgeClass = 'bg-danger';
  //   } else if (this.missingEmissions) {
  //     badgeClass = 'bg-warning';
  //   }
  //   this.unitsClass = badgeClass;
  //   this.cd.detectChanges();
  // }

  // setReportsClass() {
  //   let badgeClass: 'bg-danger' | 'bg-success' | 'bg-warning' = 'bg-success';
  //   if (this.reportingInvalid) {
  //     badgeClass = 'bg-danger';
  //   } else if (this.missingEnergyReductionGoal) {
  //     badgeClass = 'bg-warning';
  //   }
  //   this.reportingClass = badgeClass;
  //   this.cd.detectChanges();
  // }

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
      return facility.guid == this.facilityToDelete.guid
    });
    this.setupWizardService.facilities.next(this.facilities);
  }

  goToFacility(facility: IdbFacility) {

  }

  setFacilityOrder(facility: IdbFacility) {

  }
}
