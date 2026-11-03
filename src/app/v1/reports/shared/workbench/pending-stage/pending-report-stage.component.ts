import { Component, inject } from '@angular/core';
import { REPORT_HOST } from '../report-runtime.models';

@Component({ selector: 'app-pending-report-stage', standalone: false,
  templateUrl: './pending-report-stage.component.html', styleUrls: ['../report-workbench-stage.css'] })
export class PendingReportStageComponent { readonly host = inject(REPORT_HOST); }
