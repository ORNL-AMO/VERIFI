import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { AccountSavingsReportSetup, AnalysisReportSetup, BetterClimateReportSetup, BetterPlantsReportSetup, DataOverviewReportSetup, PerformanceReportSetup } from 'src/app/models/overview-report';
import { BehaviorSubject } from 'rxjs';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';

@Injectable({
  providedIn: 'root'
})
export class AccountReportsService {

  generateExcel: BehaviorSubject<boolean>;

  errorMessage: BehaviorSubject<string>;

  constructor(private accountReportDbService: AccountReportDbService,
    private formBuilder: FormBuilder
  ) {
    this.generateExcel = new BehaviorSubject<boolean>(false);
    this.errorMessage = new BehaviorSubject<string>(undefined);

    this.accountReportDbService.selectedReport.subscribe(report => {
      this.validateReport(report);
    });
  }

  validateReport(report: IdbAccountReport) {
    let errorMessage: string = '';
    //write validation for report
    if (report && report.startMonth >= 0 && report.endMonth >= 0 && report.startYear > 0 && report.endYear > 0) {
      let startDate: Date = new Date(report.startYear, report.startMonth, 1);
      let endDate: Date = new Date(report.endYear, report.endMonth, 1);
      // compare start and end date
      if (startDate.getTime() >= endDate.getTime()) {
        errorMessage = 'Start date cannot be later than the end date.';
      }
      else {
        errorMessage = '';
      }
    }
    this.errorMessage.next(errorMessage)
  }

  getSetupFormFromReport(report: IdbAccountReport): FormGroup {
    let yearValidators: Array<ValidatorFn> = [];
    let startDateValidators: Array<ValidatorFn> = [];
    let endDateValidators: Array<ValidatorFn> = [];
    if (report.reportType == 'betterPlants' || report.reportType == 'performance' || report.reportType == 'betterClimate' || report.reportType == 'analysis' || report.reportType == 'accountEmissionFactors') {
      yearValidators = [Validators.required];
    } else if (report.reportType == 'dataOverview' || report.reportType == 'accountSavings') {
      endDateValidators = [Validators.required];
      if (report.reportType == 'dataOverview') {
        startDateValidators = [Validators.required];
      }
    }

    if (report.reportType == 'performance' || report.reportType == 'betterClimate' || report.reportType == 'dataOverview' || report.reportType == 'accountSavings') {
      let form: FormGroup = this.formBuilder.group({
        reportName: [report.name, Validators.required],
        reportType: [report.reportType, Validators.required],
        reportYear: [report.reportYear, yearValidators],
        baselineYear: [report.baselineYear, yearValidators],
        startMonth: [report.startMonth, startDateValidators],
        startYear: [report.startYear, startDateValidators],
        endMonth: [report.endMonth, endDateValidators],
        endYear: [report.endYear, endDateValidators]
      });
      return form;
    }
    else if (report.reportType == 'betterPlants' || report.reportType == 'analysis') {
      let form: FormGroup = this.formBuilder.group({
        reportName: [report.name, Validators.required],
        reportType: [report.reportType, Validators.required],
        reportYear: [report.reportYear, yearValidators],
        baselineYear: [report.baselineYear, ''],
        startMonth: [report.startMonth, startDateValidators],
        startYear: [report.startYear, startDateValidators],
        endMonth: [report.endMonth, endDateValidators],
        endYear: [report.endYear, endDateValidators]
      });
      return form;
    }
    else if (report.reportType == 'accountEmissionFactors') {
      let form: FormGroup = this.formBuilder.group({
        reportName: [report.name, Validators.required],
        reportType: [report.reportType, Validators.required],
        reportYear: [report.reportYear, ''],
        baselineYear: [report.baselineYear, ''],
        startMonth: [report.startMonth, ''],
        startYear: [report.startYear, yearValidators],
        endMonth: [report.endMonth, ''],
        endYear: [report.endYear, yearValidators]
      });
      return form;
    }
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
      includeAllYears: [betterPlantsReportSetup.includeAllYears],
      includePerformanceTable: [betterPlantsReportSetup.includePerformanceTable]
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
    betterPlantsReportSetup.includePerformanceTable = form.controls.includePerformanceTable.value;
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


  getBetterCimateFormFromReport(betterClimateReportSetup: BetterClimateReportSetup): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      emissionsDisplay: [betterClimateReportSetup.emissionsDisplay, Validators.required],
      includePortfolioInformation: [betterClimateReportSetup.emissionsDisplay],
      includeAbsoluteEmissions: [betterClimateReportSetup.includePortfolioInformation],
      includeGHGEmissionsReductions: [betterClimateReportSetup.includeGHGEmissionsReductions],
      includePortfolioEnergyUse: [betterClimateReportSetup.includePortfolioEnergyUse],
      includeCalculationsForGraphs: [betterClimateReportSetup.includeCalculationsForGraphs],
      includeFacilitySummaries: [betterClimateReportSetup.includeFacilitySummaries],
      numberOfTopPerformers: [betterClimateReportSetup.numberOfTopPerformers],
      skipIntermediateYears: [betterClimateReportSetup.skipIntermediateYears],
      includeEmissionsInTables: [betterClimateReportSetup.includeEmissionsInTables],
      includePercentReductionsInTables: [betterClimateReportSetup.includePercentReductionsInTables],
      includePercentContributionsInTables: [betterClimateReportSetup.includePercentContributionsInTables],
      includeVehicleEnergyUse: [betterClimateReportSetup.includeVehicleEnergyUse],
      includeStationaryEnergyUse: [betterClimateReportSetup.includeStationaryEnergyUse]
    });
    return form;
  }

  updateBetterClimateReportFromForm(betterClimateReportSetup: BetterClimateReportSetup, form: FormGroup): BetterClimateReportSetup {
    betterClimateReportSetup.emissionsDisplay = form.controls.emissionsDisplay.value;
    betterClimateReportSetup.includePortfolioInformation = form.controls.includePortfolioInformation.value;
    betterClimateReportSetup.includeAbsoluteEmissions = form.controls.includeAbsoluteEmissions.value;
    betterClimateReportSetup.includeGHGEmissionsReductions = form.controls.includeGHGEmissionsReductions.value;
    betterClimateReportSetup.includePortfolioEnergyUse = form.controls.includePortfolioEnergyUse.value;
    betterClimateReportSetup.includeFacilitySummaries = form.controls.includeFacilitySummaries.value;
    betterClimateReportSetup.numberOfTopPerformers = form.controls.numberOfTopPerformers.value;
    betterClimateReportSetup.skipIntermediateYears = form.controls.skipIntermediateYears.value;
    betterClimateReportSetup.includeEmissionsInTables = form.controls.includeEmissionsInTables.value;
    betterClimateReportSetup.includePercentReductionsInTables = form.controls.includePercentReductionsInTables.value;
    betterClimateReportSetup.includePercentContributionsInTables = form.controls.includePercentContributionsInTables.value;
    betterClimateReportSetup.includeVehicleEnergyUse = form.controls.includeVehicleEnergyUse.value;
    betterClimateReportSetup.includeStationaryEnergyUse = form.controls.includeStationaryEnergyUse.value;
    return betterClimateReportSetup;
  }

  getAnalysisFormFromReport(analysisReportSetup: AnalysisReportSetup): FormGroup {
    if (!analysisReportSetup) {
      analysisReportSetup = {
        analysisItemId: undefined,
        includeProblemsInformation: true,
        includeExecutiveSummary: true,
        includeDataValidationTables: true
      };
    }
    let form: FormGroup = this.formBuilder.group({
      analysisItemId: [analysisReportSetup.analysisItemId, Validators.required],
      includeProblemsInformation: [analysisReportSetup.includeProblemsInformation],
      includeExecutiveSummary: [analysisReportSetup.includeExecutiveSummary],
      includeDataValidationTables: [analysisReportSetup.includeDataValidationTables],
    });
    return form;
  }

  updateAnalysisReportFromForm(analysisReportSetup: AnalysisReportSetup, form: FormGroup): AnalysisReportSetup {
    if (!analysisReportSetup) {
      analysisReportSetup = {
        analysisItemId: undefined,
        includeProblemsInformation: true,
        includeExecutiveSummary: true,
        includeDataValidationTables: true
      };
    }
    analysisReportSetup.analysisItemId = form.controls.analysisItemId.value;
    analysisReportSetup.includeProblemsInformation = form.controls.includeProblemsInformation.value;
    analysisReportSetup.includeExecutiveSummary = form.controls.includeExecutiveSummary.value;
    analysisReportSetup.includeDataValidationTables = form.controls.includeDataValidationTables.value;
    return analysisReportSetup;
  }

  getAccountSavingsFormFromReport(accountSavingsReportSetup: AccountSavingsReportSetup): FormGroup {
    if (!accountSavingsReportSetup) {
      accountSavingsReportSetup = {
        analysisItemId: undefined,
        includeAnnualResults: true,
        includeAnnualResultsTable: true,
        includeAnnualResultsGraph: true,
        includeAccountMonthlyTable: true,
        includeAccountMonthlyResults: true,
        includeFacilityResults: true,
        includeFacilityResultsTable: true,
        includeFacilityResultsGraph: true,
        includeFacilityMonthlyResultsGraph: true,
        includePerformanceResults: true,
        includePerformanceResultsTable: true,
        includePerformanceResultsGraph: true,
        includePerformanceActual: true,
        includePerformanceAdjusted: true,
        includePerformanceContribution: true,
        includePerformanceSavings: true,
        numberOfTopPerformers: 5,
        analysisTableColumns: {
          incrementalImprovement: false,
          SEnPI: false,
          savings: false,
          percentSavingsComparedToBaseline: false,
          yearToDateSavings: false,
          yearToDatePercentSavings: false,
          rollingSavings: false,
          rolling12MonthImprovement: false,
          productionVariables: false,
          energy: true,
          actualEnergy: true,
          modeledEnergy: true,
          adjusted: true,
          baselineAdjustmentForNormalization: true,
          baselineAdjustmentForOther: true,
          baselineAdjustment: true,
          totalSavingsPercentImprovement: true,
          annualSavingsPercentImprovement: true,
          cummulativeSavings: true,
          newSavings: true,
          predictors: [],
          predictorGroupId: undefined,
          bankedSavings: false,
          savingsUnbanked: false
        }
      };
    }

    if (!accountSavingsReportSetup.analysisTableColumns) {
      accountSavingsReportSetup.analysisTableColumns = {
        incrementalImprovement: false,
        SEnPI: false,
        savings: false,
        percentSavingsComparedToBaseline: false,
        yearToDateSavings: false,
        yearToDatePercentSavings: false,
        rollingSavings: false,
        rolling12MonthImprovement: false,
        productionVariables: false,
        energy: true,
        actualEnergy: true,
        modeledEnergy: true,
        adjusted: true,
        baselineAdjustmentForNormalization: true,
        baselineAdjustmentForOther: true,
        baselineAdjustment: true,
        totalSavingsPercentImprovement: true,
        annualSavingsPercentImprovement: true,
        cummulativeSavings: true,
        newSavings: true,
        predictors: [],
        predictorGroupId: undefined,
        bankedSavings: false,
        savingsUnbanked: false
      };
    }
    let form: FormGroup = this.formBuilder.group({
      analysisItemId: [accountSavingsReportSetup.analysisItemId, Validators.required],
      includeAnnualResults: [accountSavingsReportSetup.includeAnnualResults],
      includeAnnualResultsTable: [accountSavingsReportSetup.includeAnnualResultsTable],
      includeAnnualResultsGraph: [accountSavingsReportSetup.includeAnnualResultsGraph],
      includeAccountMonthlyTable: [accountSavingsReportSetup.includeAccountMonthlyTable],
      includeAccountMonthlyResults: [accountSavingsReportSetup.includeAccountMonthlyResults],
      includeFacilityResults: [accountSavingsReportSetup.includeFacilityResults],
      includeFacilityResultsTable: [accountSavingsReportSetup.includeFacilityResultsTable],
      includeFacilityResultsGraph: [accountSavingsReportSetup.includeFacilityResultsGraph],
      includeFacilityMonthlyResultsGraph: [accountSavingsReportSetup.includeFacilityMonthlyResultsGraph],
      includePerformanceResults: [accountSavingsReportSetup.includePerformanceResults],
      includePerformanceResultsTable: [accountSavingsReportSetup.includePerformanceResultsTable],
      includePerformanceResultsGraph: [accountSavingsReportSetup.includePerformanceResultsGraph],
      includePerformanceActual: [accountSavingsReportSetup.includePerformanceActual],
      includePerformanceAdjusted: [accountSavingsReportSetup.includePerformanceAdjusted],
      includePerformanceContribution: [accountSavingsReportSetup.includePerformanceContribution],
      includePerformanceSavings: [accountSavingsReportSetup.includePerformanceSavings],
      numberOfTopPerformers: [accountSavingsReportSetup.numberOfTopPerformers],
      analysisTableColumns: this.formBuilder.group({
        energy: [accountSavingsReportSetup.analysisTableColumns.energy],
        actualEnergy: [accountSavingsReportSetup.analysisTableColumns.actualEnergy],
        modeledEnergy: [accountSavingsReportSetup.analysisTableColumns.modeledEnergy],
        adjusted: [accountSavingsReportSetup.analysisTableColumns.adjusted],
        baselineAdjustmentForNormalization: [accountSavingsReportSetup.analysisTableColumns.baselineAdjustmentForNormalization],
        baselineAdjustmentForOther: [accountSavingsReportSetup.analysisTableColumns.baselineAdjustmentForOther],
        baselineAdjustment: [accountSavingsReportSetup.analysisTableColumns.baselineAdjustment],
        incrementalImprovement: [accountSavingsReportSetup.analysisTableColumns.incrementalImprovement],
        SEnPI: [accountSavingsReportSetup.analysisTableColumns.SEnPI],
        bankedSavings: [accountSavingsReportSetup.analysisTableColumns.bankedSavings],
        savingsUnbanked: [accountSavingsReportSetup.analysisTableColumns.savingsUnbanked],
        savings: [accountSavingsReportSetup.analysisTableColumns.savings],
        rollingSavings: [accountSavingsReportSetup.analysisTableColumns.rollingSavings],
        rolling12MonthImprovement: [accountSavingsReportSetup.analysisTableColumns.rolling12MonthImprovement],
        totalSavingsPercentImprovement: [accountSavingsReportSetup.analysisTableColumns.totalSavingsPercentImprovement],
        annualSavingsPercentImprovement: [accountSavingsReportSetup.analysisTableColumns.annualSavingsPercentImprovement],
        cummulativeSavings: [accountSavingsReportSetup.analysisTableColumns.cummulativeSavings],
        newSavings: [accountSavingsReportSetup.analysisTableColumns.newSavings],
        productionVariables: [accountSavingsReportSetup.analysisTableColumns.productionVariables],
        percentSavingsComparedToBaseline: [accountSavingsReportSetup.analysisTableColumns.percentSavingsComparedToBaseline],
        yearToDateSavings: [accountSavingsReportSetup.analysisTableColumns.yearToDateSavings],
        yearToDatePercentSavings: [accountSavingsReportSetup.analysisTableColumns.yearToDatePercentSavings],
        predictors: [accountSavingsReportSetup.analysisTableColumns.predictors ?? []]
      })
    });
    return form;
  }

  updateAccountSavingsReportFromForm(accountSavingsReportSetup: AccountSavingsReportSetup, form: FormGroup): AccountSavingsReportSetup {
    if (!accountSavingsReportSetup) {
      accountSavingsReportSetup = {
        analysisItemId: undefined,
        includeAnnualResults: true,
        includeAnnualResultsTable: true,
        includeAnnualResultsGraph: true,
        includeAccountMonthlyTable: true,
        includeAccountMonthlyResults: true,
        includeFacilityResults: true,
        includeFacilityResultsTable: true,
        includeFacilityResultsGraph: true,
        includeFacilityMonthlyResultsGraph: true,
        includePerformanceResults: true,
        includePerformanceResultsTable: true,
        includePerformanceResultsGraph: true,
        includePerformanceActual: true,
        includePerformanceAdjusted: true,
        includePerformanceContribution: true,
        includePerformanceSavings: true,
        numberOfTopPerformers: 5,
        analysisTableColumns: {
          incrementalImprovement: false,
          SEnPI: false,
          savings: false,
          percentSavingsComparedToBaseline: false,
          yearToDateSavings: false,
          yearToDatePercentSavings: false,
          rollingSavings: false,
          rolling12MonthImprovement: false,
          productionVariables: false,
          energy: true,
          actualEnergy: true,
          modeledEnergy: true,
          adjusted: true,
          baselineAdjustmentForNormalization: true,
          baselineAdjustmentForOther: true,
          baselineAdjustment: true,
          totalSavingsPercentImprovement: true,
          annualSavingsPercentImprovement: true,
          cummulativeSavings: true,
          newSavings: true,
          predictors: [],
          predictorGroupId: undefined,
          bankedSavings: false,
          savingsUnbanked: false
        }
      };
    }
    
    accountSavingsReportSetup.analysisItemId = form.controls.analysisItemId.value;
    accountSavingsReportSetup.includeAnnualResults = form.controls.includeAnnualResults.value;
    accountSavingsReportSetup.includeAnnualResultsTable = form.controls.includeAnnualResultsTable.value;
    accountSavingsReportSetup.includeAnnualResultsGraph = form.controls.includeAnnualResultsGraph.value;
    accountSavingsReportSetup.includeAccountMonthlyTable = form.controls.includeAccountMonthlyTable.value;
    accountSavingsReportSetup.includeAccountMonthlyResults = form.controls.includeAccountMonthlyResults.value;
    accountSavingsReportSetup.includeFacilityResults = form.controls.includeFacilityResults.value;
    accountSavingsReportSetup.includeFacilityResultsTable = form.controls.includeFacilityResultsTable.value;
    accountSavingsReportSetup.includeFacilityResultsGraph = form.controls.includeFacilityResultsGraph.value;
    accountSavingsReportSetup.includeFacilityMonthlyResultsGraph = form.controls.includeFacilityMonthlyResultsGraph.value;
    accountSavingsReportSetup.includePerformanceResults = form.controls.includePerformanceResults.value;
    accountSavingsReportSetup.includePerformanceResultsTable = form.controls.includePerformanceResultsTable.value;
    accountSavingsReportSetup.includePerformanceResultsGraph = form.controls.includePerformanceResultsGraph.value;
    accountSavingsReportSetup.includePerformanceActual = form.controls.includePerformanceActual.value;
    accountSavingsReportSetup.includePerformanceAdjusted = form.controls.includePerformanceAdjusted.value;
    accountSavingsReportSetup.includePerformanceContribution = form.controls.includePerformanceContribution.value;
    accountSavingsReportSetup.includePerformanceSavings = form.controls.includePerformanceSavings.value;
    accountSavingsReportSetup.numberOfTopPerformers = form.controls.numberOfTopPerformers.value;
    accountSavingsReportSetup.analysisTableColumns = form.controls.analysisTableColumns.value;
    return accountSavingsReportSetup;
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
    } else if (report.reportType == 'betterClimate') {
      let betterClimateForm: FormGroup = this.getBetterCimateFormFromReport(report.betterClimateReportSetup);
      return betterClimateForm.valid;
    } else if (report.reportType == 'analysis') {
      let analysisForm: FormGroup = this.getAnalysisFormFromReport(report.analysisReportSetup);
      return analysisForm.valid;
    } else if (report.reportType == 'accountSavings') {
      let accountSavingsForm: FormGroup = this.getAccountSavingsFormFromReport(report.accountSavingsReportSetup);
      return accountSavingsForm.valid;
    } else if (report.reportType == 'accountEmissionFactors') {
      return true;
    }
  }
}
