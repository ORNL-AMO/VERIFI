import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../../account-reports.service';
import { DataOverviewFacility } from '../data-overview-report.component';

@Component({
  selector: 'app-data-overview-facility-report',
  templateUrl: './data-overview-facility-report.component.html',
  styleUrls: ['./data-overview-facility-report.component.css']
})
export class DataOverviewFacilityReportComponent {
  @Input()
  dataOverviewFacility: DataOverviewFacility;
  @Input()
  overviewReport: DataOverviewReportSetup;

  printSub: Subscription;
  print: boolean;
  constructor(private accountReportsService: AccountReportsService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }
}
