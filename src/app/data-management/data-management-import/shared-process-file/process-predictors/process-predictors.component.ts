import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FileReference, getEmptyFileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
import { EditPredictorFormService } from 'src/app/shared/shared-predictors-content/edit-predictor-form.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';

@Component({
  selector: 'app-process-predictors',
  standalone: false,

  templateUrl: './process-predictors.component.html',
  styleUrl: './process-predictors.component.css'
})
export class ProcessPredictorsComponent {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  predictorsIncluded: boolean;
  allPredictorsValid: boolean;

  editPredictorForm: FormGroup;
  editPredictor: IdbPredictor;
  editPredictorFacility: IdbFacility;
  editPredictorPrevGUID: string;

  skipAll: boolean = false;
  showExisting: boolean = false;
  existingPredictorOptions: Array<IdbPredictor> = [];
  constructor(private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private editPredictorFormService: EditPredictorFormService,
    private predictorDbService: PredictorDbService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
      this.predictorsIncluded = this.fileReference.predictors.length != 0;
      if (this.predictorsIncluded) {
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
    if (predictor.id == undefined) {
      this.editPredictorPrevGUID = predictor.guid;
    }
    this.editPredictorFacility = this.fileReference.importFacilities.find(f => { return f.guid == predictor.guid });
    this.editPredictor = predictor;
    this.editPredictorForm = this.editPredictorFormService.getFormFromPredictor(predictor);
  }

  setSkipAll() {
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
    let editPredictorIndex: number;
    if (this.editPredictorPrevGUID) {
      editPredictorIndex = this.fileReference.predictors.findIndex(filePredictor => { return filePredictor.guid == this.editPredictorPrevGUID });
    } else {
      editPredictorIndex = this.fileReference.predictors.findIndex(filePredictor => { return filePredictor.guid == this.editPredictor.guid });
    }
    this.editPredictorFormService.setPredictorDataFromForm(this.editPredictor, this.editPredictorForm);
    this.fileReference.predictors[editPredictorIndex] = this.editPredictor;
    this.fileReference.predictors[editPredictorIndex].isValid = this.editPredictorForm.valid;
    this.setValidPredictors();
    this.cancelEdit();
  }

  setShowExisting() {
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let facilityPredictors: Array<IdbPredictor> = accountPredictors.filter(p => { return p.facilityId == this.editPredictor.facilityId; });
    let existingPredictorsInUse: Array<string> = this.fileReference.predictors.flatMap(predictor => {
      return predictor.guid
    });
    this.existingPredictorOptions = facilityPredictors.filter(fPredictor => {
      return !existingPredictorsInUse.includes(fPredictor.guid);
    });
    this.showExisting = true;
  }

  selectExistingPredictor(predictor: IdbPredictor) {
    let importWizardName: string = this.editPredictor.importWizardName;
    this.editPredictor = predictor;
    this.editPredictor.importWizardName = importWizardName;
    this.editPredictorForm = this.editPredictorFormService.getFormFromPredictor(predictor);
    this.showExisting = false;
  }
}