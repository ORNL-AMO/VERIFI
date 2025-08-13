import { FacilityReportOrderByPipe } from './facility-report-order-by.pipe';
import { FacilityReportTypePipe } from './facility-report-type.pipe';

describe('FacilityReportOrderByPipe', () => {
  it('create an instance', () => {
    const facilityReportTypePipe = {} as FacilityReportTypePipe; 
    const pipe = new FacilityReportOrderByPipe(facilityReportTypePipe);
    expect(pipe).toBeTruthy();
  });
});
