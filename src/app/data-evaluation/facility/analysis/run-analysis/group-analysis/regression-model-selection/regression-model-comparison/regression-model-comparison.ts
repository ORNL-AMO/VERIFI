import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-regression-model-comparison',
  standalone: false,
  templateUrl: './regression-model-comparison.html',
  styleUrl: './regression-model-comparison.css',
})
export class RegressionModelComparison {

  @Input()
  selectedFacility: IdbFacility;
  @Input()
  changedModel: { modelId: string, oldModel: JStatRegressionModel, newModel: JStatRegressionModel };
  @Input()
  showModelComparison: boolean = false;

  @Output()
  close = new EventEmitter<boolean>();

  closeModal() {
    this.close.emit(true);
  }

}
