import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-graph-calculations-table',
  templateUrl: './graph-calculations-table.component.html',
  styleUrls: ['./graph-calculations-table.component.css'],
  standalone: false
})
export class GraphCalculationsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  selectedReport: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }
}
