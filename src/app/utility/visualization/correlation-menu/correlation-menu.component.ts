import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { VisualizationStateService } from '../visualization-state.service';

@Component({
  selector: 'app-correlation-menu',
  templateUrl: './correlation-menu.component.html',
  styleUrls: ['./correlation-menu.component.css']
})
export class CorrelationMenuComponent implements OnInit {

  meterOptions: Array<{ meter: IdbUtilityMeter, selected: boolean }>;
  meterOptionsSub: Subscription;
  predictorOptions: Array<{ predictor: PredictorData, selected: boolean }>;
  predictorOptionsSub: Subscription;
  meterDataOptionSub: Subscription;
  meterDataOption: string;
  constructor(private visualizationStateService: VisualizationStateService) { }

  ngOnInit(): void {
    this.meterOptionsSub = this.visualizationStateService.meterOptions.subscribe(val => {
      this.meterOptions = val;
    });

    this.predictorOptionsSub = this.visualizationStateService.predictorOptions.subscribe(val => {
      this.predictorOptions = val;
    });

    this.meterDataOptionSub = this.visualizationStateService.meterDataOption.subscribe(val => {
      this.meterDataOption = val;
    });
  }

  ngOnDestroy() {
    this.meterOptionsSub.unsubscribe();
    this.predictorOptionsSub.unsubscribe();
    this.meterDataOptionSub.unsubscribe();
  }

  toggleMeterOption(index: number) {
    this.meterOptions[index].selected = !this.meterOptions[index].selected;
    this.visualizationStateService.meterOptions.next(this.meterOptions);
  }

  togglePredictorOption(index: number) {
    this.predictorOptions[index].selected = !this.predictorOptions[index].selected;
    this.visualizationStateService.predictorOptions.next(this.predictorOptions);
  }

  saveDataOption() {
    this.visualizationStateService.meterDataOption.next(this.meterDataOption);
  }

}
