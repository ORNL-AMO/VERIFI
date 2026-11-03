import { Component, inject } from '@angular/core';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';
import { FacilityReportEditor } from '../editing/facility-report-editor.service';

@Component({ selector: 'app-facility-report-setup', standalone: false,
  templateUrl: './facility-report-setup.component.html', styleUrls: ['./facility-report-setup.component.css'] })
export class FacilityReportSetupComponent {
  readonly context = inject(FacilityReportWorkbenchContext);
  readonly editor = inject(FacilityReportEditor);
}
