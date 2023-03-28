import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-edit-predictor-entry',
  templateUrl: './edit-predictor-entry.component.html',
  styleUrls: ['./edit-predictor-entry.component.css']
})
export class EditPredictorEntryComponent {

  addOrEdit: 'add' | 'edit';
  // predictorData: PredictorData;
  // predictorForm: FormGroup;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictordbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private formBuilder: FormBuilder) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        // this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        // this.setPredictorDataNew();
      }
    });
  }


  
  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/entries/predictor-entries-table')
  }

  saveChanges() {

  }
}
