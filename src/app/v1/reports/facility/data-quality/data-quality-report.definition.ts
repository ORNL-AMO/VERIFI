import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { DataQualityReportEditor } from './editing/data-quality-report-editor.service';
import { DataQualityReportSetupComponent } from './setup/data-quality-report-setup.component';
import { dataQualityReportOutput } from './data-quality-report-output';
import { DataQualityReportPreviewComponent } from './preview/data-quality-report-preview.component';

export const FACILITY_DATA_QUALITY_REPORT: ReportFeatureDefinition = {
  type: 'dataQuality',
  providers: [DataQualityReportEditor, {
    provide: REPORT_RUNTIME,
    useFactory: () => ({ 
      editor: inject(DataQualityReportEditor), 
      gateSetup: true, 
      output: dataQualityReportOutput() 
    })
  }],
  stages: { 
    setup: DataQualityReportSetupComponent, 
    report: DataQualityReportPreviewComponent 
  }
};
