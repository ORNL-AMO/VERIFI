import { Injectable, inject } from '@angular/core';
import { ModelingReportOutputController } from '@app/v1/reports/shared/modeling/output/modeling-report-output-controller';
import { FacilityModelingReportService } from '../modeling-report.service';

@Injectable()
export class ModelingReportOutputService extends ModelingReportOutputController {
  constructor() { super(inject(FacilityModelingReportService)); }
}
