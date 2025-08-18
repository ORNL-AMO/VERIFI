import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'facilityReportBadgeClass',
  standalone: false
})
export class FacilityReportBadgeClassPipe implements PipeTransform {

  transform(reportType: string): string {
    switch (reportType) {
      case 'analysis':
        return 'badge-analysis';
      case 'overview':
        return 'badge-data-overview';
      case 'emissionFactors':
        return 'badge-emission-factors';
      case 'savings':
        return 'badge-savings';
    }
    return '';
  }

}
