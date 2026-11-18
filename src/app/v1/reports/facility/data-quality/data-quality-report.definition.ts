import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { DataQualityReportEditor } from './editing/data-quality-report-editor.service';
import { DataQualityReportService } from './data-quality-report.service';
import { DataQualityReportSetupComponent } from './setup/data-quality-report-setup.component';
import { DataQualityReportOutputService } from './output/data-quality-report-output.service';
import { DataQualityReportPreviewComponent } from './preview/data-quality-report-preview.component';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';

export const FACILITY_DATA_QUALITY_REPORT: ReportFeatureDefinition = {
  type: 'dataQuality',
  providers: [DataQualityReportEditor, DataQualityReportService, DataQualityReportOutputService, ReportPresentationController, {
    provide: REPORT_RUNTIME,
    useFactory: () => ({
      editor: inject(DataQualityReportEditor),
      gateSetup: true,
      output: inject(DataQualityReportOutputService).output,
      presentation: inject(ReportPresentationController)
    })
  }],
  stages: {
    setup: DataQualityReportSetupComponent,
    report: DataQualityReportPreviewComponent
  }
};
