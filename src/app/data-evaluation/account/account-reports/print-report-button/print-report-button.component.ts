import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../account-reports.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';

@Component({
  selector: 'app-print-report-button',
  templateUrl: './print-report-button.component.html',
  styleUrls: ['./print-report-button.component.css'],
  standalone: false
})
export class PrintReportButtonComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input()
  isNewReport: boolean = false;
  @Input()
  isLoading: boolean = false;

  @Output() onExportPpt = new EventEmitter<void>();
  print: boolean;
  printSub: Subscription;
  selectedReport: IdbAccountReport;

  helpWidth: number;
  helpWidthSub: Subscription;

  @Output()
  exportPdf: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private accountReportsService: AccountReportsService,
    private dataEvaluationService: DataEvaluationService
  ) {

  }

  ngOnInit() {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
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
    if (this.isLoading) {
      return;
    }
    if (this.isNewReport) {
      this.exportPdf.emit();
      return;
    }
    this.dataEvaluationService.print.next(true);
  }

  printReport() {
    if (this.isLoading) {
      return;
    }

    if (!this.isNewReport) {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        setTimeout(() => {
          window.print();
          this.dataEvaluationService.print.next(false)
        }, 1000)
      }, 100)
    }
  }

  generateExcel() {
    this.accountReportsService.generateExcel.next(true);
  }

  generatePPT() {
    this.onExportPpt.emit();
  }
}
