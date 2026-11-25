import { Injectable, inject } from '@angular/core';
import { ModelingReportOutputController } from '@app/v1/reports/shared/modeling/output/modeling-report-output-controller';
import { AccountModelingReportService } from '../modeling-report.service';
import { ModelingReportWorkbookWriter } from '@platform/reports/modeling-report-workbook-writer.service';

@Injectable()
export class AccountModelingReportOutputService extends ModelingReportOutputController {
  constructor() {
    const workbook = inject(ModelingReportWorkbookWriter);
    super(inject(AccountModelingReportService), (input, signal) => workbook.build(input, signal));
  }
}
