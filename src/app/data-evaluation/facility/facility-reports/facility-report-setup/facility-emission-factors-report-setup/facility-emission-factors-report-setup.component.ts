import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacilityReport, EmissionFactorsReportSettings } from 'src/app/models/idbModels/facilityReport';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-facility-emission-factors-report-setup',
  standalone: false,

  templateUrl: './facility-emission-factors-report-setup.component.html',
  styleUrl: './facility-emission-factors-report-setup.component.css'
})
export class FacilityEmissionFactorsReportSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facilityReport: IdbFacilityReport;
  reportSettings: EmissionFactorsReportSettings;
  facilityReportSub: Subscription;
  isFormChange: boolean = false;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  months: Array<Month> = Months;

  invalidDateRange: boolean = false;
  constructor(
    private facilityReportsDbService: FacilityReportsDbService,
    private calanderizationService: CalanderizationService,
    private injector: Injector

  ) {

  }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      if (this.isFormChange == false) {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport.emissionFactorsReportSettings;
      } else {
        this.isFormChange = false;
      }
      this.setInvalidDateRange();
    });
    this.setYearOptions();
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    let facilityReport: IdbFacilityReport = this.accountWorkspaceStore.selectedFacilityReport();
    this.facilityReport.emissionFactorsReportSettings = this.reportSettings;
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(facilityReport));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectFacilityReport((facilityReport)?.guid);
  }

  setYearOptions() {
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', true, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  setInvalidDateRange() {
    if (this.reportSettings.startYear && this.reportSettings.endYear) {
      this.invalidDateRange = this.reportSettings.startYear > this.reportSettings.endYear;
    } else {
      this.invalidDateRange = false;
    }
  }
}
