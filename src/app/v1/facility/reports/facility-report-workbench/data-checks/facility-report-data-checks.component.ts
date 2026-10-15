import { Component, inject } from '@angular/core';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';

@Component({ selector: 'app-facility-report-data-checks', standalone: false,
  templateUrl: './facility-report-data-checks.component.html', styleUrls: ['./facility-report-data-checks.component.css'] })
export class FacilityReportDataChecksComponent { readonly context = inject(FacilityReportWorkbenchContext); }
