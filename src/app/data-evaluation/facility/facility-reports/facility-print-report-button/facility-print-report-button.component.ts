import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';

@Component({
  selector: 'app-facility-print-report-button',
  templateUrl: './facility-print-report-button.component.html',
  styleUrl: './facility-print-report-button.component.css',
  standalone: false
})
export class FacilityPrintReportButtonComponent {

  @Input()
  isDataQuality: boolean = false;

  print: boolean;
  printSub: Subscription;
  helpWidth: number;
  helpWidthSub: Subscription;

  @Output()
  exportPdf: EventEmitter<void> = new EventEmitter<void>();
  constructor(private dataEvaluationService: DataEvaluationService  ) {

  }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
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
    this.dataEvaluationService.print.next(true);
  }

  printReport() {
    if (!this.isDataQuality) {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        setTimeout(() => {
          window.print();
          this.dataEvaluationService.print.next(false)
        }, 1000)
      }, 100)
    }
    else {
      this.exportPdf.emit();
      this.dataEvaluationService.print.next(false);
    }
  }
}
