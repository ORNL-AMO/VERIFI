import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbAccountReport } from 'src/app/models/idb';
import { BetterPlantsReportSetup } from 'src/app/models/overview-report';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountReportsService {

  print: BehaviorSubject<boolean>;
  constructor(private formBuilder: FormBuilder) { 
    this.print = new BehaviorSubject<boolean>(false);
  }

  getSetupFormFromReport(report: IdbAccountReport): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      reportName: [report.name, Validators.required],
      reportType: [report.reportType, Validators.required],
      reportYear: [report.reportYear, Validators.required],
      baselineYear: [report.baselineYear, Validators.required]
    });
    return form;
  }

  updateReportFromSetupForm(report: IdbAccountReport, form: FormGroup): IdbAccountReport {
    report.name = form.controls.reportName.value;
    report.reportType = form.controls.reportType.value;
    report.reportYear = form.controls.reportYear.value;
    report.baselineYear = form.controls.baselineYear.value;
    return report;
  }

  getBetterPlantsFormFromReport(betterPlantsReportSetup: BetterPlantsReportSetup): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      analysisItemId: [betterPlantsReportSetup.analysisItemId, Validators.required],
      includeFacilityNames: [betterPlantsReportSetup.includeFacilityNames, Validators.required],
      baselineAdjustmentNotes: [betterPlantsReportSetup.baselineAdjustmentNotes],
      modificationNotes: [betterPlantsReportSetup.modificationNotes]
    });
    return form;
  }

  updateBetterPlantsReportFromForm(betterPlantsReportSetup: BetterPlantsReportSetup, form: FormGroup): BetterPlantsReportSetup {
    betterPlantsReportSetup.analysisItemId = form.controls.analysisItemId.value;
    betterPlantsReportSetup.includeFacilityNames = form.controls.includeFacilityNames.value;
    betterPlantsReportSetup.baselineAdjustmentNotes = form.controls.baselineAdjustmentNotes.value;
    betterPlantsReportSetup.modificationNotes = form.controls.modificationNotes.value;
    return betterPlantsReportSetup;
  }

}
