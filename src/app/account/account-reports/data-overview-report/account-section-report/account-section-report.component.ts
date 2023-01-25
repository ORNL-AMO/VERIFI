import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idb';
import { DataOverviewReportAccountSection } from 'src/app/models/overview-report';

@Component({
  selector: 'app-account-section-report',
  templateUrl: './account-section-report.component.html',
  styleUrls: ['./account-section-report.component.css']
})
export class AccountSectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';


  sectionOptions: DataOverviewReportAccountSection;
  constructor(private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    if (this.dataType == 'energyUse') {
      this.sectionOptions = selectedReport.dataOverviewReportSetup.accountEnergySection;
    } else if (this.dataType == 'emissions') {
      this.sectionOptions = selectedReport.dataOverviewReportSetup.accountEmissionsSection;
    } else if (this.dataType == 'cost') {
      this.sectionOptions = selectedReport.dataOverviewReportSetup.accountCostsSection;
    } else if (this.dataType == 'water') {
      this.sectionOptions = selectedReport.dataOverviewReportSetup.accountWaterSection;
    }
  }

}
