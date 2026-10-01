import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reportBadgeClass',
  standalone: false
})
export class ReportBadgeClassPipe implements PipeTransform {

  transform(reportType: string): string {
    switch (reportType) {
      case 'betterPlants':
        return 'badge-better-plants';
      case 'performance':
        return 'badge-performance';
      case 'dataOverview':
        return 'badge-data-overview';
      case 'betterClimate':
        return 'badge-better-climate';
      case 'analysis':
        return 'badge-analysis';
      case 'accountEmissionFactors':
        return 'badge-emission-factors';
      case 'accountSavings':
        return 'badge-savings';
    }
  }

}
