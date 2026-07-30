import { Component, Input, QueryList, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewFacility } from '../data-overview-report.component';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { FacilitySectionReportComponent } from 'src/app/shared/data-overview/facility-section-report/facility-section-report.component';

@Component({
  selector: 'app-data-overview-facility-report',
  templateUrl: './data-overview-facility-report.component.html',
  styleUrls: ['./data-overview-facility-report.component.css'],
  standalone: false
})
export class DataOverviewFacilityReportComponent {
  @Input()
  dataOverviewFacility: DataOverviewFacility;
  @Input()
  overviewReport: DataOverviewReportSetup;

  printSub: Subscription;
  print: boolean;

  @ViewChildren(FacilitySectionReportComponent) sectionReports !: QueryList<FacilitySectionReportComponent>;

  constructor(private dataEvaluationService: DataEvaluationService) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  getSectionByType(type: 'energyUse' | 'cost' | 'water'): FacilitySectionReportComponent | undefined {
    return this.sectionReports.find(section => section.dataType === type);
  }

  async getImage(type: 'energyUse' | 'cost' | 'water',
    chartType: 'meterStackedLineChart' | 'meterBarChart' | 'annualBarChart' | 'monthlyUsageLineChart'
  ): Promise<string> {
    const section = this.getSectionByType(type);
    if (!section) {
      return '';
    }
    switch (chartType) {
      case 'meterStackedLineChart':
        return await section.getMeterStackedLineChartImage();
      case 'meterBarChart':
        return await section.getMeterBarChartImage();
      case 'annualBarChart':
        return await section.getAnnualBarChartImage();
      case 'monthlyUsageLineChart':
        return await section.getMonthlyUsageLineChartImage();
      default:
        return '';
    }
  }
}