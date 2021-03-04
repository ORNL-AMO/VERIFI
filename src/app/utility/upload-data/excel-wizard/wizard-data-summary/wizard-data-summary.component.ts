import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { ImportMeterFileSummary } from '../../import-meter.service';
import { ExcelWizardService } from '../excel-wizard.service';

@Component({
  selector: 'app-wizard-data-summary',
  templateUrl: './wizard-data-summary.component.html',
  styleUrls: ['./wizard-data-summary.component.css']
})
export class WizardDataSummaryComponent implements OnInit {
  @Input()
  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string };
  @Output('emitBack')
  emitBack: EventEmitter<boolean> = new EventEmitter();
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter();

  //meter summary
  metersSummary: Array<{ meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> }>;
  //meter data summary

  //predictors summary
  constructor(private excelWizardService: ExcelWizardService, private utilityMeterdbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.metersSummary = this.excelWizardService.getMetersSummary(this.importMeterFileWizard);
  }


  continue() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterdbService.facilityMeters.getValue();
    let allMeterData: Array<IdbUtilityMeterData> = this.metersSummary.flatMap(summary => { return summary.meterData });
    this.excelWizardService.submitExcelData(this.importMeterFileWizard, allMeterData, facilityMeters);
    this.emitClose.emit(true);
  }

  back() {
    this.emitBack.emit(true);
  }
}
