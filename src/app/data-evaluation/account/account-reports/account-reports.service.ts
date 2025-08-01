import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { AnalysisReportSetup, BetterClimateReportSetup, BetterPlantsReportSetup, DataOverviewReportSetup, GoalCompletionReportSetup, PerformanceReportSetup } from 'src/app/models/overview-report';
import { BehaviorSubject } from 'rxjs';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { energy } from 'src/app/calculations/conversions/definitions/energy';
import { getGUID } from 'src/app/shared/sharedHelperFuntions';

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
    let dateValidators: Array<ValidatorFn> = [];
    if (report.reportType == 'betterPlants' || report.reportType == 'performance' || report.reportType == 'betterClimate' || report.reportType == 'analysis' || report.reportType == 'accountEmissionFactors' || report.reportType == 'goalCompletion') {
      yearValidators = [Validators.required];
    } else if (report.reportType == 'dataOverview') {
      dateValidators = [Validators.required];
    }

    if (report.reportType == 'performance' || report.reportType == 'betterClimate' || report.reportType == 'dataOverview') {
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
    else if (report.reportType == 'betterPlants' || report.reportType == 'analysis' || report.reportType == 'goalCompletion') {
      let form: FormGroup = this.formBuilder.group({
        reportName: [report.name, Validators.required],
        reportType: [report.reportType, Validators.required],
        reportYear: [report.reportYear, yearValidators],
        baselineYear: [report.baselineYear, ''],
        startMonth: [report.startMonth, dateValidators],
        startYear: [report.startYear, dateValidators],
        endMonth: [report.endMonth, dateValidators],
        endYear: [report.endYear, dateValidators]
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

  getGoalCompletionFormFromReport(goalCompletionReportSetup: GoalCompletionReportSetup): FormGroup {
    if (!goalCompletionReportSetup) {
      goalCompletionReportSetup = {
        analysisItemId: undefined,
        energyIntensityChangeArray: [],
        partnerCompanyName: undefined,
        partnerCompanyPOC: undefined,
        technicalAccountManager: undefined,
        corporateOrPlant: 'corporate',
        baselineYear: undefined,
        goalsMet: undefined,
        calculatingMethod: undefined,
        variablesUsed: undefined,
        plantLevelData: undefined,
        projects: undefined,
        additionalDetails: undefined,
        datasetsUsed: undefined,
        didCompanyShare: undefined,
        recommendations: undefined,
        additionalComments: undefined
      };
    }

    let energyIntensityChangeArray: FormArray = this.formBuilder.array(goalCompletionReportSetup.energyIntensityChangeArray ? goalCompletionReportSetup.energyIntensityChangeArray.map(change => {
      return this.formBuilder.group({
        guid: [change.guid || getGUID()],
        energyIntensityYear: [change.energyIntensityYear],
        energyIntensityChange: [change.energyIntensityChange],
        energyIntensityExplanation: [change.energyIntensityExplanation]
      });
    }) : []);

    let form: FormGroup = this.formBuilder.group({
      analysisItemId: [goalCompletionReportSetup.analysisItemId, Validators.required],
      energyIntensityChangeArray: energyIntensityChangeArray,
      partnerCompanyName: [goalCompletionReportSetup.partnerCompanyName],
      partnerCompanyPOC: [goalCompletionReportSetup.partnerCompanyPOC],
      technicalAccountManager: [goalCompletionReportSetup.technicalAccountManager],
      corporateOrPlant: [goalCompletionReportSetup.corporateOrPlant],
      baselineYear: [goalCompletionReportSetup.baselineYear],
      goalsMet: [goalCompletionReportSetup.goalsMet],
      calculatingMethod: [goalCompletionReportSetup.calculatingMethod],
      variablesUsed: [goalCompletionReportSetup.variablesUsed],
      plantLevelData: [goalCompletionReportSetup.plantLevelData],
      projects: [goalCompletionReportSetup.projects],
      additionalDetails: [goalCompletionReportSetup.additionalDetails],
      datasetsUsed: [goalCompletionReportSetup.datasetsUsed],
      didCompanyShare: [goalCompletionReportSetup.didCompanyShare],
      recommendations: [goalCompletionReportSetup.recommendations],
      additionalComments: [goalCompletionReportSetup.additionalComments]
    });
    return form;
  }

  updateGoalCompletionReportFromForm(goalCompletionReportSetup: GoalCompletionReportSetup, form: FormGroup): GoalCompletionReportSetup {
    if (!goalCompletionReportSetup) {
      goalCompletionReportSetup = {
        analysisItemId: undefined,
        energyIntensityChangeArray: [],
        partnerCompanyName: undefined,
        partnerCompanyPOC: undefined,
        technicalAccountManager: undefined,
        corporateOrPlant: 'corporate',
        baselineYear: undefined,
        goalsMet: undefined,
        calculatingMethod: undefined,
        variablesUsed: undefined,
        plantLevelData: undefined,
        projects: undefined,
        additionalDetails: undefined,
        datasetsUsed: undefined,
        didCompanyShare: undefined,
        recommendations: undefined,
        additionalComments: undefined
      };
    }
    goalCompletionReportSetup.analysisItemId = form.controls.analysisItemId.value;
    goalCompletionReportSetup.partnerCompanyName = form.controls.partnerCompanyName.value;
    goalCompletionReportSetup.partnerCompanyPOC = form.controls.partnerCompanyPOC.value;
    goalCompletionReportSetup.technicalAccountManager = form.controls.technicalAccountManager.value;
    goalCompletionReportSetup.corporateOrPlant = form.controls.corporateOrPlant.value;
    goalCompletionReportSetup.baselineYear = form.controls.baselineYear.value;
    goalCompletionReportSetup.goalsMet = form.controls.goalsMet.value;
    goalCompletionReportSetup.calculatingMethod = form.controls.calculatingMethod.value;
    goalCompletionReportSetup.variablesUsed = form.controls.variablesUsed.value;
    goalCompletionReportSetup.plantLevelData = form.controls.plantLevelData.value;
    goalCompletionReportSetup.projects = form.controls.projects.value;
    goalCompletionReportSetup.additionalDetails = form.controls.additionalDetails.value;
    goalCompletionReportSetup.datasetsUsed = form.controls.datasetsUsed.value;
    goalCompletionReportSetup.didCompanyShare = form.controls.didCompanyShare.value;
    goalCompletionReportSetup.recommendations = form.controls.recommendations.value;
    goalCompletionReportSetup.additionalComments = form.controls.additionalComments.value;

    let energyIntensityChangeArray: FormArray = form.get('energyIntensityChangeArray') as FormArray;
    if (!goalCompletionReportSetup.energyIntensityChangeArray) {
      goalCompletionReportSetup.energyIntensityChangeArray = [];
    }
    goalCompletionReportSetup.energyIntensityChangeArray = energyIntensityChangeArray.controls.map(changeGroup => {
      return {
        guid: changeGroup.get('guid').value,
        energyIntensityYear: changeGroup.get('energyIntensityYear').value,
        energyIntensityChange: changeGroup.get('energyIntensityChange').value,
        energyIntensityExplanation: changeGroup.get('energyIntensityExplanation').value
      };
    });

    return goalCompletionReportSetup;
  }

  addEnergyIntensityChangeRow(form: FormGroup) {
    const changeArray = form.get('energyIntensityChangeArray') as FormArray;
    let newRow = this.formBuilder.group({
      guid: [getGUID()],
      energyIntensityYear: [''],
      energyIntensityChange: [''],
      energyIntensityExplanation: ['']
    });
    changeArray.push(newRow);
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
    } else if (report.reportType == 'accountEmissionFactors') {
      return true;
    } else if (report.reportType == 'goalCompletion') {
      let goalCompletionForm: FormGroup = this.getGoalCompletionFormFromReport(report.goalCompletionReportSetup);
      return goalCompletionForm.valid;
    }
  }
}
