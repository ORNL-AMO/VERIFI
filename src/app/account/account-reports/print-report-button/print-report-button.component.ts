import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { AccountReportsService } from '../account-reports.service';
import { IdbAccountReport } from 'src/app/models/idb';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';

@Component({
  selector: 'app-print-report-button',
  templateUrl: './print-report-button.component.html',
  styleUrls: ['./print-report-button.component.css']
})
export class PrintReportButtonComponent {

  print: boolean;
  printSub: Subscription;
  helpPanelOpen: boolean;
  helpPanelOpenSub: Subscription;
  selectedReport: IdbAccountReport;
  constructor(private accountReportsService: AccountReportsService,
    private helpPanelService: HelpPanelService,
    private accountReportDbService: AccountReportDbService) {

  }

  ngOnInit() {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
      if (this.print) {
        this.printReport();
      }
    });

    this.helpPanelOpenSub = this.helpPanelService.helpPanelOpen.subscribe(val => {
      this.helpPanelOpen = val;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.helpPanelOpenSub.unsubscribe();
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
