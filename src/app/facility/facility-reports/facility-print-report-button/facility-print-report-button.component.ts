import { Component } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { FacilityReportsService } from '../facility-reports.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-facility-print-report-button',
    templateUrl: './facility-print-report-button.component.html',
    styleUrl: './facility-print-report-button.component.css',
    standalone: false
})
export class FacilityPrintReportButtonComponent {

  print: boolean;
  printSub: Subscription;
  helpPanelOpen: boolean;
  helpPanelOpenSub: Subscription;
  constructor(private facilityReportsService: FacilityReportsService,
    private helpPanelService: HelpPanelService) {

  }

  ngOnInit() {
    this.printSub = this.facilityReportsService.print.subscribe(print => {
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
    this.facilityReportsService.print.next(true);
  }

  printReport() {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      setTimeout(() => {
        window.print();
        this.facilityReportsService.print.next(false)
      }, 1000)
    }, 100)
  }
}
