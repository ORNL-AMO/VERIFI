import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { IdbAccount, IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { getNAICS } from 'src/app/shared/form-data/naics-data';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class BetterPlantsExcelWriterService {
  formName: string = 'BBBP-Challenge-Annual-Reporting-Form.xlsx';
  constructor() { }


  exportToExcel(report: IdbAccountReport, account: IdbAccount, betterPlantsSummary: BetterPlantsSummary) {
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/csv_templates/BBBP-Challenge-Annual-Reporting-Form.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        this.writeReportInformation(workbook, account, report, betterPlantsSummary);
        workbook.xlsx.writeBuffer().then(excelData => {
          let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          let a = document.createElement("a");
          let url = window.URL.createObjectURL(blob);
          a.href = url;
          // let date = new Date();
          // let datePipe = new DatePipe('en-us');
          // let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
          // let accountName: string = account.name;
          // accountName = accountName.replaceAll(' ', '-');
          // accountName = accountName.replaceAll('.', '_');
          // a.download = 'BP-REPORT-' + datePipe.transform(date, 'MM-dd-yyyy');
          a.download = 'BP-REPORT'
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      });
    };
    request.send();
  }

  writeReportInformation(workbook: ExcelJS.Workbook, account: IdbAccount, report: IdbAccountReport, betterPlantsSummary: BetterPlantsSummary) {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Annual Form');
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
    worksheet.getCell('D9').value = report.reportYear;
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
    if(facilities.length != 0){
      cell.value = facilities.length
    }    
  }
}