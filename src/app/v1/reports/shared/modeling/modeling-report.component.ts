import { Component, computed, input } from '@angular/core';
import { ModelingReportView } from '@domain/reports/modeling-report';
import { modelingGroupTitle, modelingModelDetails } from './modeling-report-tables';

@Component({ selector: 'app-modeling-report', standalone: false,
  templateUrl: './modeling-report.component.html', styleUrls: ['./modeling-report.component.css'] })
export class ModelingReportComponent {
  readonly title = input.required<string>();
  readonly view = input.required<ModelingReportView>();
  readonly regression = computed(() => this.view().regression.map(item => ({ ...item, heading: modelingGroupTitle(this.view(), item), details: modelingModelDetails(item),
    comparison: item.chart ? { ...item.chart, group: item.group } : undefined })));
  readonly hasIssues = computed(() => this.view().issues.some(group => group.rows.length));
}
