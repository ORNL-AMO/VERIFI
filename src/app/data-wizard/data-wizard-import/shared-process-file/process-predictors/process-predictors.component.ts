import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-wizard/data-management.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { EditPredictorFormService } from 'src/app/shared/shared-predictors-content/edit-predictor-form.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

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

  skipAll: boolean = false;
  constructor(private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private editPredictorFormService: EditPredictorFormService) { }

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