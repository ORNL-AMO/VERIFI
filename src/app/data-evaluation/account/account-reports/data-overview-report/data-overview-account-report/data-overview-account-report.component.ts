import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewAccount } from '../data-overview-report.component';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';

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
  constructor(private dataEvaluationService: DataEvaluationService) {
  }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }
}
