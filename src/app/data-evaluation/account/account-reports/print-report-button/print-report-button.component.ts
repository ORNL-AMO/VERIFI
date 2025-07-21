import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../account-reports.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';

@Component({
    selector: 'app-print-report-button',
    templateUrl: './print-report-button.component.html',
    styleUrls: ['./print-report-button.component.css'],
    standalone: false
})
export class PrintReportButtonComponent {

  print: boolean;
  printSub: Subscription;
  selectedReport: IdbAccountReport;

  helpWidth: number;
  helpWidthSub: Subscription;
  constructor(private accountReportsService: AccountReportsService,
    private accountReportDbService: AccountReportDbService,
    private dataEvaluationService: DataEvaluationService) {

  }

  ngOnInit() {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
      if (this.print) {
        this.printReport();
      }
    });
    this.helpWidthSub = this.dataEvaluationService.helpWidthBs.subscribe(helpWidth => {
      this.helpWidth = helpWidth;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.helpWidthSub.unsubscribe();
  }


  togglePrint() {
    this.accountReportsService.print.next(true);
  }

  printReport() {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      setTimeout(() => {
        window.print();
        this.accountReportsService.print.next(false)
      }, 1000)
    }, 100)
  }

  generateExcel() {
    this.accountReportsService.generateExcel.next(true);
  }
}
