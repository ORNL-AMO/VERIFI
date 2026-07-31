import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorStatistics } from '../predictorDataQualityStatistics';
import { CopyTableService } from '../../helper-services/copy-table.service';

@Component({
  selector: 'app-predictor-statistics-table',
  standalone: false,

  templateUrl: './predictor-statistics-table.component.html',
  styleUrl: './predictor-statistics-table.component.css'
})
export class PredictorStatisticsTableComponent {
  @Input({ required: true })
  stats: PredictorStatistics;
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;

  copyingTable: boolean = false;
  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;

  constructor(
    private copyTableService: CopyTableService
  ) { }


  isValueNaN(value: number): any {
    return isNaN(value);
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200);
  }
}
