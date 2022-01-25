import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { PredictorData } from 'src/app/models/idb';
import { ImportPredictorFile, UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-import-predictors-wizard',
  templateUrl: './import-predictors-wizard.component.html',
  styleUrls: ['./import-predictors-wizard.component.css']
})
export class ImportPredictorsWizardComponent implements OnInit {
  @Input()
  wizardContext: "excel" | "template";
  @Input()
  importPredictorFileWizard: ImportPredictorFile;
  @Output('emitBack')
  emitBack: EventEmitter<boolean> = new EventEmitter();
  @Output('emitContinue')
  emitContinue: EventEmitter<boolean> = new EventEmitter();


  importPredictors: Array<PredictorData>;
  facilityPredictors: Array<PredictorData>;

  skippedPredictors: Array<boolean>;

  constructor(private predictorDbService: PredictordbService, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    if (this.wizardContext == 'template') {
      this.importPredictorFileWizard = this.uploadDataService.importPredictorFileWizard.getValue();
    }

    this.facilityPredictors = this.predictorDbService.facilityPredictors.getValue();
    this.importPredictors = new Array();
    this.skippedPredictors = new Array();

    this.importPredictorFileWizard.importPredictorFileSummary.existingPredictors.forEach(predictor => {
      this.importPredictors.push(predictor);
      this.skippedPredictors.push(false);
    });
    this.importPredictorFileWizard.importPredictorFileSummary.newPredictors.forEach(predictor => {
      this.importPredictors.push(predictor);
      this.skippedPredictors.push(false);
    });
    this.importPredictorFileWizard.importPredictorFileSummary.invalidPredictors.forEach(predictor => {
      this.importPredictors.push(predictor);
      this.skippedPredictors.push(false);
    });
    this.importPredictorFileWizard.importPredictorFileSummary.skippedPredictors.forEach(predictor => {
      this.importPredictors.push(predictor);
      this.skippedPredictors.push(true);
    });
  }

  cancel() {
    this.uploadDataService.importPredictorFileWizard.next(undefined);
  }

  submit() {
    this.updateImportPredictorFileWizard();
    let importPredictorFiles: Array<ImportPredictorFile> = this.uploadDataService.importPredictorsFiles.getValue();
    let wizardFileIndex: number = importPredictorFiles.findIndex(file => { return file.id == this.importPredictorFileWizard.id });
    importPredictorFiles[wizardFileIndex] = this.importPredictorFileWizard;
    this.uploadDataService.importPredictorsFiles.next(importPredictorFiles);
    this.cancel();
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
    this.importPredictorFileWizard.importPredictorFileSummary.skippedPredictors = new Array();
    this.importPredictorFileWizard.importPredictorFileSummary.invalidPredictors = new Array();
    this.importPredictors.forEach((predictor, index) => {
      let badgeClass: string = this.getPredictorClass(predictor, index);
      if (badgeClass == 'badge-secondary') {
        this.importPredictorFileWizard.importPredictorFileSummary.skippedPredictors.push(predictor);
      } else if (badgeClass == 'badge-danger') {
        this.importPredictorFileWizard.importPredictorFileSummary.invalidPredictors.push(predictor);
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

  getPredictorClass(predictor: PredictorData, index: number): string {
    if (this.skippedPredictors[index] == true) {
      return 'badge-secondary';
    } else {
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

  toggleSkipPredictor(index: number) {
    this.skippedPredictors[index] = !this.skippedPredictors[index];
  }
}
