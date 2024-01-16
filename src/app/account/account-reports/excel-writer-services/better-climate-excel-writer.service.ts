import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { getNAICS } from 'src/app/shared/form-data/naics-data';
import * as _ from 'lodash';
import { BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';

@Injectable({
  providedIn: 'root'
})
export class BetterClimateExcelWriterService {

  constructor() { }

  exportToExcel(report: IdbAccountReport, account: IdbAccount, betterClimateReport: BetterClimateReport) {
    console.log('export to excell....')
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    let requestURL: string = 'Better-Climate-Challenge-Emissions-Reporting';
    // let requestURL: string = 'Better-Climate-Challenge-Emissions-Reporting-2023-form-(koa)'
    request.open('GET', 'assets/csv_templates/' + requestURL + '.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        this.writePortfolioEmissions(workbook, account, report, betterClimateReport);
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

  writePortfolioEmissions(workbook: ExcelJS.Workbook, account: IdbAccount, report: IdbAccountReport, betterClimateReport: BetterClimateReport) {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Portfolio Emissions');
    worksheet.getCell('D9').value = account.sustainabilityQuestions.greenhouseReductionPercent;
    worksheet.getCell('D10').value = report.reportYear;
    worksheet.getCell('D11').value = account.sustainabilityQuestions.greenhouseReductionTargetYear;

    //calander/fiscal year
    if (account.fiscalYear == "calendarYear") {
      worksheet.getCell('J9').value = 'Calendar Year';
    } else {
      worksheet.getCell('J9').value = 'Fiscal Year';
    }
    //market or location goal?
    if (report.betterClimateReportSetup.emissionsDisplay == 'location') {
      worksheet.getCell('J10').value = 'Location';
    } else {
      worksheet.getCell('J10').value = 'Market';
    }

    let columnLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    betterClimateReport.portfolioYearDetails.forEach((yearDetail, index) => {
      this.writeYearColumn(worksheet, columnLetters[index], yearDetail);
    });

  }

  writeYearColumn(worksheet: ExcelJS.Worksheet, columnLetter: string, yearDetail: BetterClimateYearDetails) {
    //Section 1: Portfolio information
    //sq ft
    worksheet.getCell(columnLetter + '16').value = yearDetail.totalSquareFeet;
    //number of facilities
    worksheet.getCell(columnLetter + '17').value = yearDetail.facilityIds.length;

    //Section 2: Absolute Emissions
    //Scope 1 Emissions
    worksheet.getCell(columnLetter + '21').value = yearDetail.emissionsResults.totalScope1Emissions;
    //stationary emissions
    worksheet.getCell(columnLetter + '22').value = yearDetail.emissionsResults.stationaryEmissions;
    //mobile emissions
    worksheet.getCell(columnLetter + '23').value = yearDetail.emissionsResults.mobileTotalEmissions;
    //fugitive emissions
    worksheet.getCell(columnLetter + '24').value = yearDetail.emissionsResults.fugitiveEmissions;
    //process emissions
    worksheet.getCell(columnLetter + '25').value = yearDetail.emissionsResults.processEmissions;

    //scope 2 emissions (location-based)
    worksheet.getCell(columnLetter + '26').value = yearDetail.emissionsResults.locationElectricityEmissions;

    //scope 2 emissions (market-based)
    worksheet.getCell(columnLetter + '27').value = yearDetail.emissionsResults.marketElectricityEmissions;

    //total emissions CALCULATED
    // worksheet.getCell(columnLetter + '28').value 

    //bioenergy and biomass
    //TODO: may need to include bio-energy for stationary fuels
    worksheet.getCell(columnLetter + '29').value = yearDetail.emissionsResults.mobileBiogenicEmissions;

    //Section 3: GHG Emission Reductions
    //GHG Emission Reductions metric tons CALCULATED
    // worksheet.getCell(columnLetter + '33').value 
    //GHG Emission Reductions % CALCULATED
    // worksheet.getCell(columnLetter + '34').value 

    //Section 4: Total Energy Use for Portfolio
    //Total electricity consumption CALCULATED
    // worksheet.getCell(columnLetter + '38').value 
    //Renewable energy generated onsite
    worksheet.getCell(columnLetter + '39').value = yearDetail.onSiteGeneratedElectricity;
    //purchased or acquired electricity
    worksheet.getCell(columnLetter + '40').value = yearDetail.purchasedElectricity;
    //physical ppas
    worksheet.getCell(columnLetter + '41').value = yearDetail.pppaElectricity;
    //financial/virtual ppas
    worksheet.getCell(columnLetter + '42').value = yearDetail.vppaElectricity;
    //unbundled recs
    worksheet.getCell(columnLetter + '43').value = yearDetail.RECs;
    //remaining grid electricity CALCULATED
    // worksheet.getCell(columnLetter + '44').value 

    //district steam
    worksheet.getCell(columnLetter + '45').value = this.getFuelValue(['Purchased Steam'], yearDetail.fuelTotals);
    //district hot water 
    worksheet.getCell(columnLetter + '46').value = this.getFuelValue(['District Hot Water'], yearDetail.fuelTotals);
    //district chilled water
    worksheet.getCell(columnLetter + '47').value = this.getFuelValue(['Purchased Chilled Water (Engine-driven Compressor)', 'Purchased Chilled Water (Electric-driven Compressor)', 'Purchased Chilled Water (Absorption Chiller)'], yearDetail.fuelTotals);
    //natural gas
    worksheet.getCell(columnLetter + '48').value = this.getFuelValue(['Natural Gas'], yearDetail.fuelTotals);
    //distillate or light fuel oil 
    //TODO: (including "Fuel Oil #...?")
    worksheet.getCell(columnLetter + '49').value = this.getFuelValue(['Distillate Fuel Oil'], yearDetail.fuelTotals);
    //propane
    worksheet.getCell(columnLetter + '50').value = this.getFuelValue(['Propane'], yearDetail.fuelTotals);
    //coke 
    //TODO: (Use both here?)
    worksheet.getCell(columnLetter + '51').value = this.getFuelValue(['Coke Oven Gas', 'Coke'], yearDetail.fuelTotals);
    //coal 
    //TODO: (All types of coal?)
    worksheet.getCell(columnLetter + '52').value = this.getFuelValue(['Coal (anthracite)', 'Coal (bituminous)', 'Coal (Lignite)', 'Coal (subbituminous)'], yearDetail.fuelTotals);
    //redisual or heavy fuel oil 
    //TODO: (including "Fuel Oil #...?")
    worksheet.getCell(columnLetter + '53').value = this.getFuelValue(['Residual Fuel Oil'], yearDetail.fuelTotals);
    //biomass
    worksheet.getCell(columnLetter + '54').value = this.getFuelValue(['Biomass'], yearDetail.fuelTotals);
    //renewable natural gas
    //TODO: idk what to do for "Renewable Natural Gas"
    worksheet.getCell(columnLetter + '55').value = this.getFuelValue([], yearDetail.fuelTotals);
    //hydrogen
    //TODO: We don't have "Hydrogen"
    worksheet.getCell(columnLetter + '56').value = this.getFuelValue([], yearDetail.fuelTotals);
    //gasoline
    //TODO: Include vehicles?
    worksheet.getCell(columnLetter + '57').value = this.getFuelValue(['Gasoline'], yearDetail.fuelTotals);
    //diesel
    worksheet.getCell(columnLetter + '58').value = this.getFuelValue(['Diesel'], yearDetail.fuelTotals);
    //biodiesel
    worksheet.getCell(columnLetter + '59').value = this.getFuelValue(['Biodiesel (100%)'], yearDetail.fuelTotals);
    //compressed natural gas
    //TODO: No CNG in stationary..
    worksheet.getCell(columnLetter + '60').value = this.getFuelValue([], yearDetail.fuelTotals);
    //liquified natural gas
    worksheet.getCell(columnLetter + '61').value = this.getFuelValue(['Liquefied Natural Gas (LNG)'], yearDetail.fuelTotals);
    //ethanol fuel blend
    worksheet.getCell(columnLetter + '62').value = this.getFuelValue(['Ethanol (100%)'], yearDetail.fuelTotals);
    //TODO: handle all other fuels we are tracking in these rows
    //other fuel (please specify)
    worksheet.getCell(columnLetter + '63').value = this.getFuelValue([], yearDetail.fuelTotals);
    //other fuel (please specify)
    worksheet.getCell(columnLetter + '64').value = this.getFuelValue([], yearDetail.fuelTotals);
    //total energy use CALCULATED
    // worksheet.getCell(columnLetter + '65').value 

    //Section 5: Energy use for vehicles
    //Electricity use
    //TODO: Need to track electrical vehicles...?
    worksheet.getCell(columnLetter + '69').value = this.getFuelValue([], yearDetail.vehicleFuelTotals);
    //Gasoline
    worksheet.getCell(columnLetter + '70').value = this.getFuelValue(['Gasoline', 'Gasoline (2-stroke)', 'Gasoline (4-stroke)', ], yearDetail.vehicleFuelTotals);
    //Diesel
    worksheet.getCell(columnLetter + '71').value = this.getFuelValue(['Diesel'], yearDetail.vehicleFuelTotals);
    //Biodiesel
    worksheet.getCell(columnLetter + '72').value = this.getFuelValue(['Biodiesel'], yearDetail.vehicleFuelTotals);
    //compressed natural gas
    //TODO: Don't have Compressed Natural Gas?
    worksheet.getCell(columnLetter + '73').value = this.getFuelValue([], yearDetail.vehicleFuelTotals);
    //liquified natural gas
    worksheet.getCell(columnLetter + '74').value = this.getFuelValue(['LPG'], yearDetail.vehicleFuelTotals);
    //ethanol fuel blend
    worksheet.getCell(columnLetter + '75').value = this.getFuelValue(['Ethanol (100%)'], yearDetail.vehicleFuelTotals);
    
    //other fuel (gasoline, diesel, propane)
    //TODO: how to handle this..
    // worksheet.getCell(columnLetter + '76').value
    //other fuel (please specify)
    //TODO: how to handle this..
    // worksheet.getCell(columnLetter + '77').value

    //total vehicle energy use CALCULATED
    // worksheet.getCell(columnLetter + '78').value 
  }

  getFuelValue(fuelTypes: Array<string>, fuelTotals: Array<{ fuelType: string, total: number }>): number {
    let fuelTotal: { fuelType: string, total: number } = fuelTotals.find(fuelTotal => {
      return fuelTypes.includes(fuelTotal.fuelType);
    });
    if (fuelTotal) {
      return fuelTotal.total;
    }
    return 0;
  }

}
