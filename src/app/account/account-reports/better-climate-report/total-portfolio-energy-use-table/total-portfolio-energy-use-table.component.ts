import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-total-portfolio-energy-use-table',
  templateUrl: './total-portfolio-energy-use-table.component.html',
  styleUrls: ['./total-portfolio-energy-use-table.component.css'],
  standalone: false
})
export class TotalPortfolioEnergyUseTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  tableType: 'total' | 'stationary';
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  @Input()
  showTitle: boolean = false;
  selectedReport: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }
}
