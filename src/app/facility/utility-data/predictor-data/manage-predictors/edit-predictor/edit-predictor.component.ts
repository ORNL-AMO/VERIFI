import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-edit-predictor',
  templateUrl: './edit-predictor.component.html',
  styleUrls: ['./edit-predictor.component.css']
})
export class EditPredictorComponent {


  addOrEdit: 'add' | 'edit';
  predictorData: PredictorData;
  predictorForm: FormGroup;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictordbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private formBuilder: FormBuilder) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
      }
    });
  }

  setPredictorDataEdit(predictorId: string) {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    this.predictorData = facilityPredictors.find(predictor => { return predictor.id == predictorId });
    this.predictorForm = this.formBuilder.group({
      'name': [this.predictorData.name, [Validators.required]],
      'unit': [this.predictorData.unit],
      'description': [this.predictorData.description],
      'production': [this.predictorData.production || false]
    });
  }

  setPredictorDataNew() {
    this.predictorForm = this.formBuilder.group({
      'name': ['New Predictor', [Validators.required]],
      'unit': [],
      'description': [],
      'production': [false]
    });
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/manage/predictor-table')
  }

  saveChanges() {

  }
}
