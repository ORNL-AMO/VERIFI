import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-vehicle-energy-use-table',
  templateUrl: './vehicle-energy-use-table.component.html',
  styleUrls: ['./vehicle-energy-use-table.component.css'],
  standalone: false
})
export class VehicleEnergyUseTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  selectedReport: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }
}
