import { Component, computed, inject } from '@angular/core';
import { predictorIcon } from '@app/v1/data/predictors/models/predictor-card.models';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { DataQualityReportService } from '../data-quality-report.service';
import { dataQualityReportView, dataQualityReportMessages } from '../data-quality-report.view';

@Component({
  selector: 'app-data-quality-report-preview',
  standalone: false,
  templateUrl: './data-quality-report-preview.component.html',
  styleUrls: ['./data-quality-report-preview.component.css']
})
export class DataQualityReportPreviewComponent {
  readonly results = inject(DataQualityReportService);
  readonly editor = this.results.editor;
  private readonly view = computed(() => {
    const result = this.results.state().value;
    return result ? dataQualityReportView(result, this.editor.draft().settings) : undefined;
  });
  readonly meters = computed(() => this.view()?.meters.map(meter => ({
    ...meter, icon: meterSourceIcon(meter.report.meter.source)
  })) ?? []);
  readonly predictors = computed(() => this.view()?.predictors.map(predictor => ({
    ...predictor, icon: predictorIcon(predictor.report.predictor)
  })) ?? []);
  readonly canPresent = computed(() => this.results.state().state === 'ready'
    && (this.meters().length > 0 || this.predictors().length > 0));
  readonly messages = dataQualityReportMessages();
}
