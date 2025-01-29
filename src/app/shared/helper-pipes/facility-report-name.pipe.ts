import { Pipe, PipeTransform } from '@angular/core';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';

@Pipe({
    name: 'facilityReportName',
    standalone: false
})
export class FacilityReportNamePipe implements PipeTransform {

  constructor(private facilityReportDbService: FacilityReportsDbService) {
  }
  
  transform(reportId: string): string {
    return this.facilityReportDbService.getReportName(reportId);
  }

}
