import { Component } from '@angular/core';
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
  constructor(private facilityReportsService: FacilityReportsService) {

  }

  ngOnInit() {
    this.printSub = this.facilityReportsService.print.subscribe(print => {
      this.print = print;
      if (this.print) {
        this.printReport();
      }
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
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
