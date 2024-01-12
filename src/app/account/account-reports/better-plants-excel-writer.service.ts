import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { getNAICS } from 'src/app/shared/form-data/naics-data';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class BetterPlantsExcelWriterService {

  constructor() { }

  exportToExcel(report: IdbAccountReport, account: IdbAccount, betterPlantsSummaries: Array<BetterPlantsSummary>, analysisItem: IdbAccountAnalysisItem) {
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    let requestURL: string;
    if (analysisItem.analysisCategory == 'energy') {
      requestURL = 'BBBP-Challenge-Annual-Reporting-Form';
    } else if (analysisItem.analysisCategory == 'water') {
      requestURL = 'BBBP-Water-Data-Collection-Form-modified';
    }
    request.open('GET', 'assets/csv_templates/' + requestURL + '.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        if (analysisItem.analysisCategory == 'energy') {
          if (report.betterPlantsReportSetup.includeAllYears) {
            betterPlantsSummaries.forEach(betterPlantsSummary => {
              this.writeEnergyReportInformation(workbook, account, report, betterPlantsSummary);
            });
          } else {
            this.writeEnergyReportInformation(workbook, account, report, betterPlantsSummaries[0]);
          }
        } else if (analysisItem.analysisCategory == 'water') {
          if (report.betterPlantsReportSetup.includeAllYears) {
            betterPlantsSummaries.forEach(betterPlantsSummary => {
              this.writeWaterReportInformation(workbook, account, report, betterPlantsSummary);
            });
          } else {
            this.writeWaterReportInformation(workbook, account, report, betterPlantsSummaries[0]);
          }
        }
        workbook.xlsx.writeBuffer().then(excelData => {
          let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          let a = document.createElement("a");
          let url = window.URL.createObjectURL(blob);
          a.href = url;
          a.download = requestURL;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      });
    };
    request.send();
  }

  writeEnergyReportInformation(workbook: ExcelJS.Workbook, account: IdbAccount, report: IdbAccountReport, betterPlantsSummary: BetterPlantsSummary) {
    let worksheet: ExcelJS.Worksheet;
    if (report.betterPlantsReportSetup.includeAllYears) {
      //create copy of worksheet for each report
      let reportYearWorksheet: ExcelJS.Worksheet = workbook.getWorksheet('Annual Form')
      worksheet = workbook.addWorksheet('Annual Form (' + betterPlantsSummary.reportYear + ')');
      worksheet.model = Object.assign(reportYearWorksheet.model, {
        mergeCells: reportYearWorksheet.model['merges']
      });
    } else {
      worksheet = workbook.getWorksheet('Annual Form');
    }
    worksheet.name = 'Annual Form (' + betterPlantsSummary.reportYear + ')';
    //account name
    worksheet.getCell('D3').value = account.name;
    //contact name
    worksheet.getCell('D4').value = account.contactName;
    //address
    worksheet.getCell('D5').value = account.address + ' ' + account.city + ', ' + account.state + ' ' + account.zip + ' ' + account.country;
    //phone
    worksheet.getCell('D6').value = account.contactPhone;
    //email
    worksheet.getCell('D7').value = account.contactEmail;
    //NAICS of participating plants
    worksheet.getCell('D8').value = getNAICS(account);
    //Year of reported data
    worksheet.getCell('D9').value = betterPlantsSummary.reportYear;
    //base year
    worksheet.getCell('D10').value = report.baselineYear;

    //# of participating plants
    worksheet.getCell('D12').value = betterPlantsSummary.baselineYearEnergyResults.numberOfFacilities;
    worksheet.getCell('E12').value = betterPlantsSummary.reportYearEnergyResults.numberOfFacilities;

    //Primary Energy Consumed
    //Electrity
    worksheet.getCell('D14').value = betterPlantsSummary.baselineYearEnergyResults.electricityUse;
    worksheet.getCell('E14').value = betterPlantsSummary.reportYearEnergyResults.electricityUse;
    //Natural gas
    worksheet.getCell('D15').value = betterPlantsSummary.baselineYearEnergyResults.naturalGasUse;
    worksheet.getCell('E15').value = betterPlantsSummary.reportYearEnergyResults.naturalGasUse;
    //Distilate fuel oil
    worksheet.getCell('D16').value = betterPlantsSummary.baselineYearEnergyResults.distilateFuelUse;
    worksheet.getCell('E16').value = betterPlantsSummary.reportYearEnergyResults.distilateFuelUse;
    //residual or heavy fuel oil
    worksheet.getCell('D17').value = betterPlantsSummary.baselineYearEnergyResults.residualFuelUse;
    worksheet.getCell('E17').value = betterPlantsSummary.reportYearEnergyResults.residualFuelUse;
    //coal
    worksheet.getCell('D18').value = betterPlantsSummary.baselineYearEnergyResults.coalUse;
    worksheet.getCell('E18').value = betterPlantsSummary.reportYearEnergyResults.coalUse;
    //coke
    worksheet.getCell('D19').value = betterPlantsSummary.baselineYearEnergyResults.cokeEnergyUse;
    worksheet.getCell('E19').value = betterPlantsSummary.reportYearEnergyResults.cokeEnergyUse;
    //blast furnace gas
    worksheet.getCell('D20').value = betterPlantsSummary.baselineYearEnergyResults.blastFurnaceEnergyUse;
    worksheet.getCell('E20').value = betterPlantsSummary.reportYearEnergyResults.blastFurnaceEnergyUse;
    //wood waste
    worksheet.getCell('D21').value = betterPlantsSummary.baselineYearEnergyResults.woodWasteEnergyUse;
    worksheet.getCell('E21').value = betterPlantsSummary.reportYearEnergyResults.woodWasteEnergyUse;
    //other gas (please specify)
    if (betterPlantsSummary.baselineYearEnergyResults.otherGasUse || betterPlantsSummary.reportYearEnergyResults.otherGasUse) {
      //specify if in use
      let otherGasFuels: Array<string> = _.uniq(betterPlantsSummary.baselineYearEnergyResults.otherGasFuels);
      let cellName: string = 'Other Gas ('
      otherGasFuels.forEach((fuel, index) => {
        cellName = cellName + fuel;
        if (index != otherGasFuels.length - 1) {
          cellName = cellName + ', ';
        }
      });
      cellName = cellName + ')'
      worksheet.getCell('C22').value = cellName;
    }
    worksheet.getCell('D22').value = betterPlantsSummary.baselineYearEnergyResults.otherGasUse;
    worksheet.getCell('E22').value = betterPlantsSummary.reportYearEnergyResults.otherGasUse;
    //Other liquid (please specifiy)
    if (betterPlantsSummary.baselineYearEnergyResults.otherLiquidUse || betterPlantsSummary.reportYearEnergyResults.otherLiquidUse) {
      //specify if in use
      let otherLiquidFuels: Array<string> = _.uniq(betterPlantsSummary.baselineYearEnergyResults.otherLiquidFuels);
      let cellName: string = 'Other Liquid ('
      otherLiquidFuels.forEach((fuel, index) => {
        cellName = cellName + fuel;
        if (index != otherLiquidFuels.length - 1) {
          cellName = cellName + ', ';
        }
      });
      cellName = cellName + ')'
      worksheet.getCell('C23').value = cellName;
    }
    worksheet.getCell('D23').value = betterPlantsSummary.baselineYearEnergyResults.otherLiquidUse;
    worksheet.getCell('E23').value = betterPlantsSummary.reportYearEnergyResults.otherLiquidUse;
    //Other soild (please specifiy)
    if (betterPlantsSummary.baselineYearEnergyResults.otherSolidUse || betterPlantsSummary.reportYearEnergyResults.otherSolidUse) {
      //specify if in use
      let otherSolidFuels: Array<string> = _.uniq(betterPlantsSummary.baselineYearEnergyResults.otherSolidFuels);
      let cellName: string = 'Other Solid ('
      otherSolidFuels.forEach((fuel, index) => {
        cellName = cellName + fuel;
        if (index != otherSolidFuels.length - 1) {
          cellName = cellName + ', ';
        }
      });
      cellName = cellName + ')'
      worksheet.getCell('C24').value = cellName;
    }
    worksheet.getCell('D24').value = betterPlantsSummary.baselineYearEnergyResults.otherSolidUse;
    worksheet.getCell('E24').value = betterPlantsSummary.reportYearEnergyResults.otherSolidUse;
    //Other energy
    if (betterPlantsSummary.baselineYearEnergyResults.otherEnergyUse || betterPlantsSummary.reportYearEnergyResults.otherEnergyUse) {
      //specify if in use
      let otherEnergyTypes: Array<string> = _.uniq(betterPlantsSummary.baselineYearEnergyResults.otherEnergyTypes);
      let cellName: string = 'Other Energy ('
      otherEnergyTypes.forEach((fuel, index) => {
        cellName = cellName + fuel;
        if (index != otherEnergyTypes.length - 1) {
          cellName = cellName + ', ';
        }
      });
      cellName = cellName + ')'
      worksheet.getCell('C25').value = cellName;
      worksheet.getCell('D25').value = betterPlantsSummary.baselineYearEnergyResults.otherEnergyUse;
      worksheet.getCell('E25').value = betterPlantsSummary.reportYearEnergyResults.otherEnergyUse;
    }

    //baseline adjustment
    worksheet.getCell('D27').value = betterPlantsSummary.reportYearAnalysisSummary.baselineAdjustmentForNormalization;
    //baseline adjustment for other
    worksheet.getCell('D28').value = betterPlantsSummary.reportYearAnalysisSummary.baselineAdjustmentForOther;
    //new energy savings for current year
    worksheet.getCell('E30').value = betterPlantsSummary.reportYearAnalysisSummary.newSavings
    //annual change in energy intensity for current year
    worksheet.getCell('E33').value = betterPlantsSummary.percentAnnualImprovement / 100;
    //total improvement in energy intensity
    worksheet.getCell('E34').value = betterPlantsSummary.percentTotalEnergyImprovement / 100;

    //baseline adjustment notes
    if (report.betterPlantsReportSetup.baselineAdjustmentNotes) {
      worksheet.getCell('C39').value = report.betterPlantsReportSetup.baselineAdjustmentNotes;
    }
    //modification notes
    if (report.betterPlantsReportSetup.modificationNotes) {
      worksheet.getCell('C44').value = report.betterPlantsReportSetup.modificationNotes;
    }

    this.addPerformanceLevel(undefined, 0, worksheet.getCell('E53'), betterPlantsSummary);
    this.addPerformanceLevel(0, 2, worksheet.getCell('E54'), betterPlantsSummary);
    this.addPerformanceLevel(2, 4, worksheet.getCell('E55'), betterPlantsSummary);
    this.addPerformanceLevel(4, 6, worksheet.getCell('E56'), betterPlantsSummary);
    this.addPerformanceLevel(6, 8, worksheet.getCell('E57'), betterPlantsSummary);
    this.addPerformanceLevel(8, 10, worksheet.getCell('E58'), betterPlantsSummary);
    this.addPerformanceLevel(10, 15, worksheet.getCell('E59'), betterPlantsSummary);
    this.addPerformanceLevel(15, 20, worksheet.getCell('E60'), betterPlantsSummary);
    this.addPerformanceLevel(20, 25, worksheet.getCell('E61'), betterPlantsSummary);
    this.addPerformanceLevel(25, 30, worksheet.getCell('E62'), betterPlantsSummary);
    this.addPerformanceLevel(30, 35, worksheet.getCell('E63'), betterPlantsSummary);
    this.addPerformanceLevel(35, undefined, worksheet.getCell('E64'), betterPlantsSummary);
  }

  writeWaterReportInformation(workbook: ExcelJS.Workbook, account: IdbAccount, report: IdbAccountReport, betterPlantsSummary: BetterPlantsSummary) {
    let worksheet: ExcelJS.Worksheet;
    if (report.betterPlantsReportSetup.includeAllYears) {
      //create copy of worksheet for each report
      let reportYearWorksheet: ExcelJS.Worksheet = workbook.getWorksheet('Baseline Form')
      worksheet = workbook.addWorksheet('Baseline Form (' + betterPlantsSummary.reportYear + ')');
      worksheet.model = Object.assign(reportYearWorksheet.model, {
        mergeCells: reportYearWorksheet.model['merges']
      });
    } else {
      worksheet = workbook.getWorksheet('Baseline Form');
    }
    
    worksheet.name = 'Baseline Form (' + betterPlantsSummary.reportYear + ')';

    //account name
    worksheet.getCell('E8').value = account.name;
    //contact name
    worksheet.getCell('E9').value = account.contactName;
    //E10 = contact title. not tracked in VERIFI.

    //address
    worksheet.getCell('E11').value = account.address + ' ' + account.city + ', ' + account.state + ' ' + account.zip + ' ' + account.country;
    //phone
    worksheet.getCell('E12').value = account.contactPhone;
    //email
    worksheet.getCell('E13').value = account.contactEmail;
    //NAICS of participating plants
    worksheet.getCell('E14').value = getNAICS(account);
    //Year of reported data
    worksheet.getCell('E15').value = betterPlantsSummary.reportYear;
    //base year
    worksheet.getCell('E16').value = report.baselineYear;

    //# participating facilities
    worksheet.getCell('E19').value = betterPlantsSummary.reportYearWaterResults.numberOfFacilities;
    worksheet.getCell('F19').value = betterPlantsSummary.baselineYearWaterResults.numberOfFacilities;
    //# participating facilities that are manufacturing plants
    worksheet.getCell('E20').value = betterPlantsSummary.reportYearWaterResults.numberOfManufacturingFacilities;
    worksheet.getCell('F20').value = betterPlantsSummary.baselineYearWaterResults.numberOfManufacturingFacilities;

    //water utility (public or private)
    worksheet.getCell('E24').value = betterPlantsSummary.baselineYearWaterResults.waterUtility.use;
    worksheet.getCell('F24').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.waterUtility.meteredType);
    worksheet.getCell('G24').value = betterPlantsSummary.reportYearWaterResults.waterUtility.use;
    worksheet.getCell('H24').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.waterUtility.meteredType);
    //additionalWaterUtility
    worksheet.getCell('E25').value = betterPlantsSummary.baselineYearWaterResults.additionalWaterUtility.use;
    worksheet.getCell('F25').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalWaterUtility.meteredType);
    worksheet.getCell('G25').value = betterPlantsSummary.reportYearWaterResults.additionalWaterUtility.use;
    worksheet.getCell('H25').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalWaterUtility.meteredType);

    //surface freshwater
    worksheet.getCell('E26').value = betterPlantsSummary.baselineYearWaterResults.surfaceFreshwater.use
    worksheet.getCell('F26').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.surfaceFreshwater.meteredType);
    worksheet.getCell('G26').value = betterPlantsSummary.reportYearWaterResults.surfaceFreshwater.use;
    worksheet.getCell('H26').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.surfaceFreshwater.meteredType);
    //additionalSurfaceFreshWater
    worksheet.getCell('E27').value = betterPlantsSummary.baselineYearWaterResults.additionalSurfaceFreshWater.use
    worksheet.getCell('F27').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalSurfaceFreshWater.meteredType);
    worksheet.getCell('G27').value = betterPlantsSummary.reportYearWaterResults.additionalSurfaceFreshWater.use;
    worksheet.getCell('H27').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalSurfaceFreshWater.meteredType);

    //ground freshwater
    worksheet.getCell('E28').value = betterPlantsSummary.baselineYearWaterResults.groundFreshwater.use
    worksheet.getCell('F28').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.groundFreshwater.meteredType);
    worksheet.getCell('G28').value = betterPlantsSummary.reportYearWaterResults.groundFreshwater.use;
    worksheet.getCell('H28').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.groundFreshwater.meteredType);
    //additionalGroundFreshwater
    worksheet.getCell('E29').value = betterPlantsSummary.baselineYearWaterResults.additionalGroundFreshwater.use
    worksheet.getCell('F29').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalGroundFreshwater.meteredType);
    worksheet.getCell('G29').value = betterPlantsSummary.reportYearWaterResults.additionalGroundFreshwater.use;
    worksheet.getCell('H29').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalGroundFreshwater.meteredType);

    //other freshwater
    worksheet.getCell('E30').value = betterPlantsSummary.baselineYearWaterResults.otherFreshwater.use
    worksheet.getCell('F30').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.otherFreshwater.meteredType);
    worksheet.getCell('G30').value = betterPlantsSummary.reportYearWaterResults.otherFreshwater.use;
    worksheet.getCell('H30').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.otherFreshwater.meteredType);
    //additionalOtherFreshwater
    worksheet.getCell('E31').value = betterPlantsSummary.baselineYearWaterResults.additionalOtherFreshwater.use
    worksheet.getCell('F31').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalOtherFreshwater.meteredType);
    worksheet.getCell('G31').value = betterPlantsSummary.reportYearWaterResults.additionalOtherFreshwater.use;
    worksheet.getCell('H31').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalOtherFreshwater.meteredType);

    //total saline water intake
    worksheet.getCell('E32').value = betterPlantsSummary.baselineYearWaterResults.salineWaterIntake.use
    worksheet.getCell('F32').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.salineWaterIntake.meteredType);
    worksheet.getCell('G32').value = betterPlantsSummary.reportYearWaterResults.salineWaterIntake.use;
    worksheet.getCell('H32').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.salineWaterIntake.meteredType);
    //additionalSalineWaterIntake
    worksheet.getCell('E33').value = betterPlantsSummary.baselineYearWaterResults.additionalSalineWaterIntake.use
    worksheet.getCell('F33').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalSalineWaterIntake.meteredType);
    worksheet.getCell('G33').value = betterPlantsSummary.reportYearWaterResults.additionalSalineWaterIntake.use;
    worksheet.getCell('H33').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalSalineWaterIntake.meteredType);

    //rainwater
    worksheet.getCell('E34').value = betterPlantsSummary.baselineYearWaterResults.rainwater.use
    worksheet.getCell('F34').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.rainwater.meteredType);
    worksheet.getCell('G34').value = betterPlantsSummary.reportYearWaterResults.rainwater.use;
    worksheet.getCell('H34').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.rainwater.meteredType);
    //additionalRainwater
    worksheet.getCell('E35').value = betterPlantsSummary.baselineYearWaterResults.additionalRainwater.use
    worksheet.getCell('F35').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalRainwater.meteredType);
    worksheet.getCell('G35').value = betterPlantsSummary.reportYearWaterResults.additionalRainwater.use;
    worksheet.getCell('H35').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalRainwater.meteredType);

    //externally supplied recycled
    worksheet.getCell('E36').value = betterPlantsSummary.baselineYearWaterResults.externallySuppliedRecycled.use
    worksheet.getCell('F36').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.externallySuppliedRecycled.meteredType);
    worksheet.getCell('G36').value = betterPlantsSummary.reportYearWaterResults.externallySuppliedRecycled.use;
    worksheet.getCell('H36').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.externallySuppliedRecycled.meteredType);
    //additionalExternallySuppliedRecycled
    worksheet.getCell('E37').value = betterPlantsSummary.baselineYearWaterResults.additionalExternallySuppliedRecycled.use
    worksheet.getCell('F37').value = this.getMeteredOrEstimated(betterPlantsSummary.baselineYearWaterResults.additionalExternallySuppliedRecycled.meteredType);
    worksheet.getCell('G37').value = betterPlantsSummary.reportYearWaterResults.additionalExternallySuppliedRecycled.use;
    worksheet.getCell('H37').value = this.getMeteredOrEstimated(betterPlantsSummary.reportYearWaterResults.additionalExternallySuppliedRecycled.meteredType);

    //total water intake
    worksheet.getCell('E38').value = betterPlantsSummary.baselineYearWaterResults.totalWaterIntake;
    worksheet.getCell('G38').value = betterPlantsSummary.reportYearWaterResults.totalWaterIntake;

    //total water intake included in target
    worksheet.getCell('E39').value = betterPlantsSummary.baselineYearWaterResults.totalWaterIntakeIncludeAdditional
    worksheet.getCell('G39').value = betterPlantsSummary.reportYearWaterResults.totalWaterIntakeIncludeAdditional;

    worksheet.getCell('E41').value = betterPlantsSummary.reportYearAnalysisSummary.baselineAdjustmentForNormalization
    worksheet.getCell('E42').value = report.betterPlantsReportSetup.baselineAdjustmentNotes
    worksheet.getCell('E43').value = betterPlantsSummary.reportYearAnalysisSummary.adjustedForNormalization

    let cellLetters = ['E', 'F', 'G', 'H', 'I']
    betterPlantsSummary.reportYearWaterResults.unitsUsed.forEach((unit, index) => {
      if (index < 5) {
        let cellLetter = cellLetters[index];
        worksheet.getCell(cellLetter + '45').value = unit;
      }
    });

    worksheet.getCell('E48').value = report.betterPlantsReportSetup.baselineYearWaterPilotGoal;
    worksheet.getCell('F48').value = report.betterPlantsReportSetup.reportYearWaterPilotGoal;

    worksheet.getCell('E50').value = betterPlantsSummary.percentAnnualImprovement
    worksheet.getCell('E51').value = betterPlantsSummary.percentTotalWaterImprovement

    //baseline adjustment notes
    if (report.betterPlantsReportSetup.baselineAdjustmentNotes) {
      worksheet.getCell('D55').value = report.betterPlantsReportSetup.baselineAdjustmentNotes;
    }
    //modification notes
    if (report.betterPlantsReportSetup.modificationNotes) {
      worksheet.getCell('D61').value = report.betterPlantsReportSetup.modificationNotes;
    }

    this.addPerformanceLevel(undefined, 0, worksheet.getCell('E71'), betterPlantsSummary);
    this.addPerformanceLevel(0, 2, worksheet.getCell('E72'), betterPlantsSummary);
    this.addPerformanceLevel(2, 4, worksheet.getCell('E73'), betterPlantsSummary);
    this.addPerformanceLevel(4, 6, worksheet.getCell('E74'), betterPlantsSummary);
    this.addPerformanceLevel(6, 8, worksheet.getCell('E75'), betterPlantsSummary);
    this.addPerformanceLevel(8, 10, worksheet.getCell('E76'), betterPlantsSummary);
    this.addPerformanceLevel(10, 15, worksheet.getCell('E77'), betterPlantsSummary);
    this.addPerformanceLevel(15, 20, worksheet.getCell('E78'), betterPlantsSummary);
    this.addPerformanceLevel(20, 25, worksheet.getCell('E79'), betterPlantsSummary);
    this.addPerformanceLevel(25, 30, worksheet.getCell('E80'), betterPlantsSummary);
    this.addPerformanceLevel(30, 35, worksheet.getCell('E81'), betterPlantsSummary);
    this.addPerformanceLevel(35, undefined, worksheet.getCell('E82'), betterPlantsSummary);
  }

  addPerformanceLevel(min: number, max: number, cell: ExcelJS.Cell, betterPlantsSummary: BetterPlantsSummary) {
    let facilities: Array<{ facility: IdbFacility, performance: number }> = betterPlantsSummary.facilityPerformance.filter(facilityPerformance => {
      if (min != undefined && max != undefined) {
        return facilityPerformance.performance > min && facilityPerformance.performance < max;
      } else if (min != undefined) {
        return facilityPerformance.performance > min;
      } else if (max != undefined) {
        return facilityPerformance.performance < max;
      }
    });
    if (facilities.length != 0) {
      cell.value = facilities.length
    }
  }

  getMeteredOrEstimated(meteredType: 'Metered' | 'Estimated' | 'Mixed' | 'N/A'): 'metered' | 'estimated' | 'mixed' {
    if (meteredType == 'Metered') {
      return 'metered';
    } else if (meteredType == 'Estimated') {
      return 'estimated';
    } else if (meteredType == 'Mixed') {
      return 'mixed';
    }
    return;
  }
}
