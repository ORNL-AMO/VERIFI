import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-portfolio-information-table',
  templateUrl: './portfolio-information-table.component.html',
  styleUrls: ['./portfolio-information-table.component.css'],
  standalone: false
})
export class PortfolioInformationTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  selectedReport: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService) {}

  ngOnInit(): void {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }
}
