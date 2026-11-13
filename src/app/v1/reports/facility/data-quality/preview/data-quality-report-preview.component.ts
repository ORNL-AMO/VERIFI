import { Component, computed, inject } from '@angular/core';
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
  readonly meters = computed(() => this.view()?.meters ?? []);
  readonly predictors = computed(() => this.view()?.predictors ?? []);
  readonly messages = dataQualityReportMessages();
}
