import { Component, Input, QueryList, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewAccount } from '../data-overview-report.component';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AccountSectionReportComponent } from './account-section-report/account-section-report.component';

type SectionType = 'usageDonut' | 'map' | 'utilityUsageDonut' | 'utilityUsageStackedBar' | 'monthlyUsageLineChart';
type DataType = 'energyUse' | 'cost' | 'water';

@Component({
  selector: 'app-data-overview-account-report',
  templateUrl: './data-overview-account-report.component.html',
  styleUrls: ['./data-overview-account-report.component.css'],
  standalone: false
})
export class DataOverviewAccountReportComponent {
  @Input()
  overviewReport: DataOverviewReportSetup;
  @Input()
  accountData: DataOverviewAccount;

  print: boolean = false;
  printSub: Subscription;

  @ViewChildren(AccountSectionReportComponent) accountSectionReports !: QueryList<AccountSectionReportComponent>;

  constructor(private dataEvaluationService: DataEvaluationService) {
  }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  getSectionByType(dataType: DataType) {
    return this.accountSectionReports.find(section => section.dataType === dataType);
  }

  async getChartImageProviders(sectionType: SectionType, dataType: DataType): Promise<string> {
    const section = this.getSectionByType(dataType);
    if (!section) {
      return '';
    }
    if (sectionType === 'usageDonut') {
      return await section.getUsageDonutImage();
    } else if (sectionType === 'map') {
      return await section.getMapImage();
    } else if (sectionType === 'utilityUsageDonut' && dataType !== 'water') {
      return await section.getUtilityUsageDonutImage();
    } else if (sectionType === 'utilityUsageDonut' && dataType === 'water') {
      return await section.getWaterUsageDonutImage();
    } else if (sectionType === 'utilityUsageStackedBar' && dataType !== 'water') {
      return await section.getUtilityUsageStackedBarImage();
    } else if (sectionType === 'utilityUsageStackedBar' && dataType === 'water') {
      return await section.getWaterUsageStackedBarImage();
    } else if (sectionType === 'monthlyUsageLineChart') {
      return await section.getMonthlyUsageLineChartImage();
    }
    return '';
  }
}
