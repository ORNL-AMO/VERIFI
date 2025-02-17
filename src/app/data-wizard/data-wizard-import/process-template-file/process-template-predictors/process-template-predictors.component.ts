import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditPredictorFormService } from 'src/app/shared/shared-predictors-content/edit-predictor-form.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';


@Component({
  selector: 'app-process-template-predictors',
  templateUrl: './process-template-predictors.component.html',
  styleUrl: './process-template-predictors.component.css',
  standalone: false
})
export class ProcessTemplatePredictorsComponent {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  predictorsIncluded: boolean;
  allPredictorsValid: boolean;

  editPredictorForm: FormGroup;
  editPredictor: IdbPredictor;
  editPredictorFacility: IdbFacility;

  skipAll: boolean = false;
  constructor(private activatedRoute: ActivatedRoute,
    private router: Router,
    private dataWizardService: DataWizardService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private editPredictorFormService: EditPredictorFormService,
    private predictorDbService: PredictorDbService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
      this.predictorsIncluded = this.fileReference.predictors.length != 0;
      if (this.predictorsIncluded) {
        // this.setFacilityMeterGroups();
        this.fileReference.predictors.forEach(predictor => {
          let form: FormGroup = this.editPredictorFormService.getFormFromPredictor(predictor);
          predictor.isValid = form.valid;
        });
        this.setValidPredictors();
      } else {
        this.allPredictorsValid = true;
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  goBack() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-template-file/' + this.fileReference.id + '/meter-readings');
  }

  next() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-template-file/' + this.fileReference.id + '/predictor-data');
  }

  async submitPredictors() {
    this.loadingService.setLoadingMessage('Uploading Predictors..');
    this.loadingService.setLoadingStatus(true);
    for (let i = 0; i < this.fileReference.predictors.length; i++) {
      let predictor: IdbPredictor = this.fileReference.predictors[i];
      if (!predictor.skipImport) {
        if (predictor.id) {
          await firstValueFrom(this.predictorDbService.updateWithObservable(predictor));
          await this.analysisDbService.updateAnalysisPredictor(predictor);
        } else {
          await firstValueFrom(this.predictorDbService.addWithObservable(predictor));
          await this.analysisDbService.addAnalysisPredictor(predictor);
        }
      }
    }
    this.fileReference.predictorsSubmitted = true;
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictors Uploaded!', undefined, undefined, false, 'alert-success');
  }


  setValidPredictors() {
    let isAllValid: boolean = true;
    this.fileReference.predictors.forEach(predictor => {
      if (!predictor.isValid && !predictor.skipImport) {
        isAllValid = false;
      }
    });
    this.allPredictorsValid = isAllValid;
  }

  setEditPredictor(predictor: IdbPredictor) {
    this.editPredictorFacility = this.fileReference.importFacilities.find(f => { return f.guid == predictor.guid });
    this.editPredictor = predictor;
    this.editPredictorForm = this.editPredictorFormService.getFormFromPredictor(predictor);
  }

  setSkipAll() {
    this.skipAll = !this.skipAll;
    this.fileReference.predictors.forEach(predictor => {
      predictor.skipImport = this.skipAll;
    });
  }

  cancelEdit() {
    this.editPredictorForm = undefined;
    this.editPredictor = undefined;
    this.editPredictorFacility = undefined;
  }

  submitPredictor() {
    this.editPredictorFormService.setPredictorDataFromForm(this.editPredictor, this.editPredictorForm);
    this.editPredictor.isValid = this.editPredictorForm.valid;
    this.setValidPredictors();
    this.cancelEdit();
  }
}
