import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { IdbAccountReport } from 'src/app/models/idb';
import { BetterPlantsReportSetup, DataOverviewReportSetup, PerformanceReportSetup } from 'src/app/models/overview-report';
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
    if (report.reportType == 'betterPlants' || report.reportType == 'performance') {
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
      modificationNotes: [betterPlantsReportSetup.modificationNotes],
      methodologyNotes: [betterPlantsReportSetup.methodologyNotes],
      baselineYearWaterPilotGoal: [betterPlantsReportSetup.baselineYearWaterPilotGoal],
      reportYearWaterPilotGoal: [betterPlantsReportSetup.reportYearWaterPilotGoal],
      includeAllYears: [betterPlantsReportSetup.includeAllYears]
    });
    return form;
  }

  updateBetterPlantsReportFromForm(betterPlantsReportSetup: BetterPlantsReportSetup, form: FormGroup): BetterPlantsReportSetup {
    betterPlantsReportSetup.analysisItemId = form.controls.analysisItemId.value;
    betterPlantsReportSetup.includeFacilityNames = form.controls.includeFacilityNames.value;
    betterPlantsReportSetup.baselineAdjustmentNotes = form.controls.baselineAdjustmentNotes.value;
    betterPlantsReportSetup.modificationNotes = form.controls.modificationNotes.value;
    betterPlantsReportSetup.methodologyNotes = form.controls.methodologyNotes.value;
    betterPlantsReportSetup.reportYearWaterPilotGoal = form.controls.reportYearWaterPilotGoal.value;
    betterPlantsReportSetup.baselineYearWaterPilotGoal = form.controls.baselineYearWaterPilotGoal.value;
    betterPlantsReportSetup.includeAllYears = form.controls.includeAllYears.value;
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

  getPerformanceFormFromReport(performanceReportSetup: PerformanceReportSetup): FormGroup {
    if (!performanceReportSetup) {
      performanceReportSetup = {
        analysisItemId: undefined,
        includeFacilityPerformanceDetails: true,
        includeUtilityPerformanceDetails: true,
        includeGroupPerformanceDetails: false,
        includeTopPerformersTable: true,
        groupPerformanceByYear: false,
        numberOfTopPerformers: 5,
        includeActual: false,
        includeAdjusted: true,
        includeContribution: true,
        includeSavings: true,
      };
    }
    let form: FormGroup = this.formBuilder.group({
      analysisItemId: [performanceReportSetup.analysisItemId, Validators.required],
      includeFacilityPerformanceDetails: [performanceReportSetup.includeFacilityPerformanceDetails],
      includeUtilityPerformanceDetails: [performanceReportSetup.includeUtilityPerformanceDetails],
      includeGroupPerformanceDetails: [performanceReportSetup.includeGroupPerformanceDetails],
      groupPerformanceByYear: [performanceReportSetup.groupPerformanceByYear],
      numberOfTopPerformers: [performanceReportSetup.numberOfTopPerformers],
      includeActual: [performanceReportSetup.includeActual],
      includeAdjusted: [performanceReportSetup.includeAdjusted],
      includeContribution: [performanceReportSetup.includeContribution],
      includeSavings: [performanceReportSetup.includeSavings],
      includeTopPerformersTable: [performanceReportSetup.includeTopPerformersTable]
    });
    return form;
  }

  updatePerformanceReportSetupFromForm(performanceReportSetup: PerformanceReportSetup, form: FormGroup): PerformanceReportSetup {
    if (!performanceReportSetup) {
      performanceReportSetup = {
        analysisItemId: undefined,
        includeFacilityPerformanceDetails: true,
        includeUtilityPerformanceDetails: true,
        includeGroupPerformanceDetails: false,
        groupPerformanceByYear: false,
        includeTopPerformersTable: true,
        numberOfTopPerformers: 5,
        includeActual: false,
        includeAdjusted: true,
        includeContribution: true,
        includeSavings: true,
      };
    }
    performanceReportSetup.analysisItemId = form.controls.analysisItemId.value;
    performanceReportSetup.includeFacilityPerformanceDetails = form.controls.includeFacilityPerformanceDetails.value;
    performanceReportSetup.includeUtilityPerformanceDetails = form.controls.includeUtilityPerformanceDetails.value;
    performanceReportSetup.includeGroupPerformanceDetails = form.controls.includeGroupPerformanceDetails.value;
    performanceReportSetup.groupPerformanceByYear = form.controls.groupPerformanceByYear.value;
    performanceReportSetup.numberOfTopPerformers = form.controls.numberOfTopPerformers.value;
    performanceReportSetup.includeActual = form.controls.includeActual.value;
    performanceReportSetup.includeAdjusted = form.controls.includeAdjusted.value;
    performanceReportSetup.includeContribution = form.controls.includeContribution.value;
    performanceReportSetup.includeSavings = form.controls.includeSavings.value;
    performanceReportSetup.includeTopPerformersTable = form.controls.includeTopPerformersTable.value;
    return performanceReportSetup;
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
    } else if (report.reportType == 'performance') {
      let performanceForm: FormGroup = this.getPerformanceFormFromReport(report.performanceReportSetup);
      return performanceForm.valid;
    }
  }
}
