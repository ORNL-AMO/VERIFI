import { Component, inject } from '@angular/core';
import { FacilityAnalysisReportService } from '../analysis-report.service';
@Component({ selector: 'app-analysis-report-data-checks', standalone: false, templateUrl: './analysis-report-data-checks.component.html', styleUrls: ['./analysis-report-data-checks.component.css'] })
export class AnalysisReportDataChecksComponent { readonly report = inject(FacilityAnalysisReportService); }
