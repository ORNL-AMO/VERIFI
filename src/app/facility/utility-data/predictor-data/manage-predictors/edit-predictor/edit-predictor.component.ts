import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';
import { NoaaService } from 'src/app/noaa.service';
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';
import { UnitConversionTypes } from './unitConversionTypes';

@Component({
  selector: 'app-edit-predictor',
  templateUrl: './edit-predictor.component.html',
  styleUrls: ['./edit-predictor.component.css']
})
export class EditPredictorComponent {


  addOrEdit: 'add' | 'edit';
  predictorData: PredictorData;
  predictorForm: FormGroup;
  showReferencePredictors: boolean;
  referencePredictors: Array<PredictorData>;
  unitConversionTypes: Array<{ measure: string, display: string }> = UnitConversionTypes;
  unitOptions: Array<string> = [];
  referencePredictorName: string;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictordbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private formBuilder: FormBuilder,
    private convertUnitsService: ConvertUnitsService,
    private noaaService: NoaaService) {
  }

  ngOnInit() {
    // this.noaaService.get();

    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
      }
      this.setReferencePredictors()
    });
  }

  setPredictorDataEdit(predictorId: string) {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    this.predictorData = facilityPredictors.find(predictor => { return predictor.id == predictorId });
    this.setPredictorForm();
  }

  setPredictorDataNew() {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    this.predictorData = this.predictorDbService.getNewPredictor(facilityPredictors);
    this.setPredictorForm();
  }

  setPredictorForm() {
    this.predictorForm = this.formBuilder.group({
      'name': [this.predictorData.name, [Validators.required]],
      'unit': [this.predictorData.unit],
      'description': [this.predictorData.description],
      'production': [this.predictorData.production || false],
      'predictorType': [this.predictorData.predictorType],
      'referencePredictorId': [this.predictorData.referencePredictorId],
      'convertFrom': [this.predictorData.convertFrom],
      'convertTo': [this.predictorData.convertTo],
      'conversionType': [this.predictorData.conversionType],
      'mathAction': [],
      'mathAmount': [],
      'weatherDataType': [this.predictorData.weatherDataType],
      'degreeDayThreshold': [this.predictorData.degreeDayThreshold],
    });
    this.setShowReferencePredictors()
    this.setUnitOptions();
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/manage/predictor-table')
  }

  saveChanges() {

  }

  setShowReferencePredictors() {
    this.showReferencePredictors = this.predictorForm.controls.predictorType.value == 'Conversion' || this.predictorForm.controls.predictorType.value == 'Math';
  }

  setReferencePredictors() {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    this.referencePredictors = facilityPredictors.filter(predictor => { return predictor.id != this.predictorData.id });
  }

  setUnitOptions() {
    if (this.predictorForm.controls.conversionType.value) {
      this.unitOptions = this.convertUnitsService.possibilities(this.predictorForm.controls.conversionType.value);
    } else {
      this.unitOptions = [];
    }
  }

  setReferencePredictorName() {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let referencePredictor: PredictorData = facilityPredictors.find(predictor => { return predictor.id == this.predictorForm.controls.referencePredictorId.value });
    if (referencePredictor) {
      this.referencePredictorName = referencePredictor.name;
    }
  }
}
