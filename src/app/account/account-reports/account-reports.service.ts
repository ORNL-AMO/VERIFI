import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { IdbAccountReport } from 'src/app/models/idb';
import { BetterPlantsReportSetup, DataOverviewReportSetup } from 'src/app/models/overview-report';
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
    let yearValidators: Array<ValidatorFn> = [];
    let dateValidators: Array<ValidatorFn> = [];
    if (report.reportType == 'betterPlants') {
      yearValidators = [Validators.required];
    } else if (report.reportType == 'dataOverview') {
      dateValidators = [Validators.required];
    }


    let form: FormGroup = this.formBuilder.group({
      reportName: [report.name, Validators.required],
      reportType: [report.reportType, Validators.required],
      reportYear: [report.reportYear, yearValidators],
      baselineYear: [report.baselineYear, yearValidators],
      startMonth: [report.startMonth, dateValidators],
      startYear: [report.startYear, dateValidators],
      endMonth: [report.endMonth, dateValidators],
      endYear: [report.endYear, dateValidators]
    });
    return form;
  }

  updateReportFromSetupForm(report: IdbAccountReport, form: FormGroup): IdbAccountReport {
    report.name = form.controls.reportName.value;
    report.reportType = form.controls.reportType.value;
    report.reportYear = form.controls.reportYear.value;
    report.baselineYear = form.controls.baselineYear.value;
    report.startMonth = form.controls.startMonth.value;
    report.startYear = form.controls.startYear.value;
    report.endMonth = form.controls.endMonth.value;
    report.endYear = form.controls.endYear.value;
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

  getDataOverviewFormFromReport(dataOverviewReportSetup: DataOverviewReportSetup): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      energyIsSource: [dataOverviewReportSetup.energyIsSource, Validators.required],
      emissionsDisplay: [dataOverviewReportSetup.emissionsDisplay],
      includeEnergySection: [dataOverviewReportSetup.includeEnergySection, Validators.required],
      includeCostsSection: [dataOverviewReportSetup.includeCostsSection, Validators.required],
      includeEmissionsSection: [dataOverviewReportSetup.includeEmissionsSection, Validators.required],
      includeWaterSection: [dataOverviewReportSetup.includeWaterSection, Validators.required],
      includeMap: [dataOverviewReportSetup.includeMap, Validators.required],
      includeFacilityTable: [dataOverviewReportSetup.includeFacilityTable, Validators.required],
      includeFacilityDonut: [dataOverviewReportSetup.includeFacilityDonut, Validators.required],
      includeUtilityTable: [dataOverviewReportSetup.includeUtilityTable, Validators.required],
      includeStackedBarChart: [dataOverviewReportSetup.includeStackedBarChart, Validators.required],
      includeMonthlyLineChart: [dataOverviewReportSetup.includeMonthlyLineChart, Validators.required],
    });
    return form;
  }

  updateDataOverviewReportFromForm(dataOverviewReportSetup: DataOverviewReportSetup, form: FormGroup): DataOverviewReportSetup {
    dataOverviewReportSetup.energyIsSource = form.controls.energyIsSource.value;
    dataOverviewReportSetup.emissionsDisplay = form.controls.emissionsDisplay.value;
    dataOverviewReportSetup.includeEnergySection = form.controls.includeEnergySection.value;
    dataOverviewReportSetup.includeCostsSection = form.controls.includeCostsSection.value;
    dataOverviewReportSetup.includeEmissionsSection = form.controls.includeEmissionsSection.value;
    dataOverviewReportSetup.includeWaterSection = form.controls.includeWaterSection.value;
    dataOverviewReportSetup.includeMap = form.controls.includeMap.value;
    dataOverviewReportSetup.includeFacilityTable = form.controls.includeFacilityTable.value;
    dataOverviewReportSetup.includeFacilityDonut = form.controls.includeFacilityDonut.value;
    dataOverviewReportSetup.includeUtilityTable = form.controls.includeUtilityTable.value;
    dataOverviewReportSetup.includeStackedBarChart = form.controls.includeStackedBarChart.value;
    dataOverviewReportSetup.includeMonthlyLineChart = form.controls.includeMonthlyLineChart.value;
    return dataOverviewReportSetup;
  }

  isReportValid(report: IdbAccountReport): boolean {
    let setupForm: FormGroup = this.getSetupFormFromReport(report);
    if (setupForm.invalid) {
      return false;
    }
    if (report.reportType == 'betterPlants') {
      let bpForm: FormGroup = this.getBetterPlantsFormFromReport(report.betterPlantsReportSetup);
      return bpForm.valid;
    } else if (report.reportType == 'dataOverview') {
      let dataForm: FormGroup = this.getDataOverviewFormFromReport(report.dataOverviewReportSetup);
      return dataForm.valid;
    }
  }
}
