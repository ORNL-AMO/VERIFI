import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { PredictorData } from 'src/app/models/idb';
import { ImportPredictorFileSummary } from '../import-predictors.service';

@Component({
  selector: 'app-import-predictors-wizard',
  templateUrl: './import-predictors-wizard.component.html',
  styleUrls: ['./import-predictors-wizard.component.css']
})
export class ImportPredictorsWizardComponent implements OnInit {
  @Input()
  wizardContext: "excel" | "template";
  @Input()
  importPredictorFileWizard: { fileName: string, importPredictorFileSummary: ImportPredictorFileSummary, id: string };
  @Output('emitBack')
  emitBack: EventEmitter<boolean> = new EventEmitter();
  @Output('emitContinue')
  emitContinue: EventEmitter<boolean> = new EventEmitter();


  importPredictors: Array<PredictorData>;
  facilityPredictors: Array<PredictorData>;
  constructor(private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.facilityPredictors = this.predictorDbService.facilityPredictors.getValue();
    this.importPredictors = new Array();
    this.importPredictorFileWizard.importPredictorFileSummary.existingPredictors.forEach(predictor => {
      this.importPredictors.push(predictor);
    });
    this.importPredictorFileWizard.importPredictorFileSummary.newPredictors.forEach(predictor => {
      this.importPredictors.push(predictor);
    });
  }


  cancel() {

  }

  submit() {

  }

  back() {
    this.emitBack.emit(true);
  }

  continue() {
    this.updateImportPredictorFileWizard();
    this.emitContinue.emit(true);
  }

  updateImportPredictorFileWizard() {
    this.importPredictorFileWizard.importPredictorFileSummary.existingPredictors = new Array();
    this.importPredictorFileWizard.importPredictorFileSummary.newPredictors = new Array();
    // this.importPredictorFileWizard.importPredictorFileSummary.invalidMeters = new Array();
    // this.importPredictorFileWizard.importPredictorFileSummary.skippedMeters = new Array();
    this.importPredictors.forEach((predictor, index) => {
      let badgeClass: string = this.getPredictorClass(predictor);
      if (badgeClass == 'badge-secondary') {
        // this.importMeterFileWizard.importMeterFileSummary.skippedMeters.push(meter);
      } else if (badgeClass == 'badge-danger') {
        // this.importMeterFileWizard.importMeterFileSummary.invalidMeters.push(meter);
      } else if (badgeClass == 'badge-warning') {
        let findPredictor: PredictorData = this.facilityPredictors.find(facilityPedictor => { return facilityPedictor.name == predictor.name })
        let predictorCopy: PredictorData = JSON.parse(JSON.stringify(findPredictor));
        predictorCopy.importWizardName = predictor.importWizardName;
        this.importPredictorFileWizard.importPredictorFileSummary.existingPredictors.push(predictorCopy);
      } else if (badgeClass == 'badge-success') {
        this.importPredictorFileWizard.importPredictorFileSummary.newPredictors.push(predictor);
      }
    });

  }

  getPredictorClass(predictor: PredictorData): string {
    if (!predictor.name) {
      return 'badge-danger';
    } else {
      let findPredictor: PredictorData = this.facilityPredictors.find(facilityPedictor => { return facilityPedictor.name == predictor.name });
      if (findPredictor) {
        return 'badge-warning';
      } else {
        return 'badge-success';
      }

    }
  }

}
