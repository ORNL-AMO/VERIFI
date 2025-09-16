import { AccountReportTypePipe } from './account-report-type.pipe';
import { ReportOrderByPipe } from './report-order-by.pipe';

describe('ReportOrderByPipe', () => {
  it('create an instance', () => {
    const accountReportTypePipe = {} as AccountReportTypePipe;
    const pipe = new ReportOrderByPipe(accountReportTypePipe);
    expect(pipe).toBeTruthy();
  });
});
