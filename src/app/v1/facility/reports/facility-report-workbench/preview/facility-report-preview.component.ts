import { Component, inject } from '@angular/core';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';

@Component({ selector: 'app-facility-report-preview', standalone: false,
  templateUrl: './facility-report-preview.component.html', styleUrls: ['./facility-report-preview.component.css'] })
export class FacilityReportPreviewComponent { readonly context = inject(FacilityReportWorkbenchContext); }
