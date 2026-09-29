import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { FacilitydbService } from '@data/indexedDB/facility-db.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { ExportReportPdfService } from '@app/v0/shared/pdf-report/services/export-report-pdf.service';
import { AccountEmissionFactorsReportAdapter } from '../account-emission-factors-report.adapter';

@Component({
  selector: 'app-account-emission-factors-report',
  standalone: false,

  templateUrl: './account-emission-factors-report.component.html',
  styleUrl: './account-emission-factors-report.component.css'
})
export class AccountEmissionFactorsReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  accountFacilities: Array<IdbFacility> = [];
  isExportingPdf: boolean = false;

  constructor(
    private dataEvaluationService: DataEvaluationService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private exportReportPdfService: ExportReportPdfService,
    private accountEmissionFactorsReportAdapter: AccountEmissionFactorsReportAdapter,
  ) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }
    this.account = this.accountWorkspaceStore.account();
    this.facilityDbService.getAllAccountFacilities(this.account.guid).then(facilities => {
      this.accountFacilities = facilities;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  async onExportPdf() {
    let selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!selectedReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const document = this.accountEmissionFactorsReportAdapter.buildDocument({
        report: selectedReport,
        accountFacilities: this.accountFacilities
      });
      await this.exportReportPdfService.export(document, `${selectedReport.name} - Emission Factors Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }
}