import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import * as _ from 'lodash';
import { BetterClimateReport } from 'src/app/calculations/carbon-calculations/betterClimateReport';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';

@Injectable({
  providedIn: 'root'
})
export class BetterClimateExcelWriterService {

  constructor(private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService) { }

  /*
    NOTES REGARDING BETTER CLIMATE CHALLANGE EMISSIONS REPORTING EXCEL FILE
    If you are updating the excel file with a new version make sure you:
    - Check hidden tabs, we have removed "Display" tab
    - Removed conditional formatting from given excel
    - Check name manager for links to sharepoint
    - Double check that rows are properly mapped still :(  
  */

  exportToExcel(report: IdbAccountReport, account: IdbAccount, betterClimateReport: BetterClimateReport) {
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    let requestURL: string = 'Better-Climate-Challenge-Emissions-Reporting';
    request.open('GET', 'assets/csv_templates/' + requestURL + '.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        this.writePortfolioEmissions(workbook, account, report, betterClimateReport);
        this.writeFacilityEmissions(workbook, report, betterClimateReport);
        this.writeReductionInitiatives(workbook, report);
        workbook.xlsx.writeBuffer().then(excelData => {
          let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          let a = document.createElement("a");
          let url = window.URL.createObjectURL(blob);
          a.href = url;
          a.download = requestURL + '_VERIFI';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.loadingService.setLoadingStatus(false);
        });
        this.loadingService.setLoadingStatus(false);

      });
    };

    request.onerror = () => {
      this.toastNotificationService.showToast('An Error Occurred', 'Something went wrong while generating the excel report. Notifiy ORNL for further assistance.', 1000, false, 'alert-danger');
      this.loadingService.setLoadingStatus(false);
    }
    request.send();
  }

  writePortfolioEmissions(workbook: ExcelJS.Workbook, account: IdbAccount, report: IdbAccountReport, betterClimateReport: BetterClimateReport) {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Portfolio Emissions');
    worksheet.getCell('D10').value = account.name;

    worksheet.getCell('D12').value = account.sustainabilityQuestions.greenhouseReductionPercent / 100;

    worksheet.getCell('D13').value = report.baselineYear;

    worksheet.getCell('D14').value = account.sustainabilityQuestions.greenhouseReductionTargetYear;

    //calander/fiscal year
    if (account.fiscalYear == "calendarYear") {
      worksheet.getCell('J12').value = 'Calendar Year (December 31)';
    } else {
      worksheet.getCell('J12').value = this.getFiscalYearEnd(account.fiscalYearMonth);
    }
    //market or location goal?
    if (report.betterClimateReportSetup.emissionsDisplay == 'location') {
      worksheet.getCell('J13').value = 'Location-Based GHG Goal';
    } else {
      worksheet.getCell('J13').value = 'Market-Based GHG Goal';
    }

    if(account.sustainabilityQuestions.energyReductionGoal){
      console.log()
      worksheet.getCell('J14').value = account.sustainabilityQuestions.energyReductionPercent / 100;
    }

    let columnLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    betterClimateReport.portfolioYearDetails.forEach((yearDetail, index) => {
      this.writeYearColumn(worksheet, columnLetters[index], yearDetail);
    });
  }

  writeYearColumn(worksheet: ExcelJS.Worksheet, columnLetter: string, yearDetail: BetterClimateYearDetails) {
    //Section 1: Portfolio information
    //sq ft
    worksheet.getCell(columnLetter + '19').value = yearDetail.totalSquareFeet;
    //number of facilities
    worksheet.getCell(columnLetter + '20').value = yearDetail.facilityIds.length;

    //Section 2: Absolute Emissions
    //Scope 1 Emissions
    worksheet.getCell(columnLetter + '24').value = yearDetail.emissionsResults.totalScope1Emissions;
    //stationary emissions
    worksheet.getCell(columnLetter + '25').value = yearDetail.emissionsResults.stationaryEmissions;
    //mobile emissions
    worksheet.getCell(columnLetter + '26').value = yearDetail.emissionsResults.mobileTotalEmissions;
    //fugitive emissions
    worksheet.getCell(columnLetter + '27').value = yearDetail.emissionsResults.fugitiveEmissions;
    //process emissions
    worksheet.getCell(columnLetter + '28').value = yearDetail.emissionsResults.processEmissions;

    //scope 2 emissions (location-based)
    worksheet.getCell(columnLetter + '29').value = yearDetail.emissionsResults.locationElectricityEmissions;

    //scope 2 emissions (market-based)
    worksheet.getCell(columnLetter + '30').value = yearDetail.emissionsResults.marketElectricityEmissions;

    //scope 3 (VERIFI does not track)
    //Row 31 & 32

    //total emissions CALCULATED
    // worksheet.getCell(columnLetter + '28').value  = yearDetail.totalEmissions;

    //bioenergy and biomass
    //TODO: may need to include bio-energy for stationary fuels
    worksheet.getCell(columnLetter + '34').value = yearDetail.emissionsResults.totalBiogenicEmissions;

    //Section 3: GHG Emission Reductions
    //GHG Emission Reductions metric tons CALCULATED
    // worksheet.getCell(columnLetter + '38').value = yearDetail.totalEmissions;
    //GHG Emission Reductions % CALCULATED
    // worksheet.getCell(columnLetter + '39').value 

    //Section 4: Total Energy Use for Portfolio
    //Total electricity consumption CALCULATED
    // worksheet.getCell(columnLetter + '43').value 
    //Renewable energy generated onsite
    worksheet.getCell(columnLetter + '44').value = yearDetail.onSiteGeneratedElectricity;
    //purchased or acquired electricity
    worksheet.getCell(columnLetter + '45').value = yearDetail.purchasedElectricity;
    //physical ppas
    worksheet.getCell(columnLetter + '46').value = yearDetail.pppaElectricity;
    //financial/virtual ppas
    worksheet.getCell(columnLetter + '47').value = yearDetail.vppaElectricity;
    //unbundled recs
    worksheet.getCell(columnLetter + '48').value = yearDetail.RECs;
    //remaining grid electricity CALCULATED
    // worksheet.getCell(columnLetter + '49').value 

    //stationary and mobile fuels
    let fuelVals: { usedFuels: Array<string>, usage: number } = { usedFuels: [], usage: 0 };
    //district steam
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Purchased Steam'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '50').value = fuelVals.usage;
    //district hot water 
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['District Hot Water'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '51').value = fuelVals.usage;
    //district chilled water
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Purchased Chilled Water (Engine-driven Compressor)', 'Purchased Chilled Water (Electric-driven Compressor)', 'Purchased Chilled Water (Absorption Chiller)'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '52').value = fuelVals.usage;
    //natural gas
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Natural Gas'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '53').value = fuelVals.usage;
    //distillate or light fuel oil 1, 2, 4
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Distillate Fuel Oil', 'Fuel Oil #1', 'Fuel Oil #2', 'Fuel Oil #4'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '54').value = fuelVals.usage;
    //propane
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Propane'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '55').value = fuelVals.usage;
    //coke 
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Coke'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '56').value = fuelVals.usage;
    //coal 
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Coal (anthracite)', 'Coal (bituminous)', 'Coal (Lignite)', 'Coal (subbituminous)'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '57').value = fuelVals.usage;
    //redisual or heavy fuel oil 5, 6
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Residual Fuel Oil', 'Fuel Oil #5 (Navy Special)', 'Fuel Oil #6 (high sulfur)', 'Fuel Oil #6 (low sulfur)'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '58').value = fuelVals.usage;
    //biomass
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Biomass'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '59').value = fuelVals.usage;
    //renewable natural gas
    //TODO: "Renewable Natural Gas": issue 1418
    fuelVals = this.getFuelValue(fuelVals.usedFuels, [], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '60').value = fuelVals.usage;
    //hydrogen
    //TODO: We don't have "Hydrogen": issue 1418
    fuelVals = this.getFuelValue(fuelVals.usedFuels, [], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '61').value = fuelVals.usage;
    //gasoline
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Gasoline'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '62').value = fuelVals.usage;
    //diesel
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Diesel'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '63').value = fuelVals.usage;
    //biodiesel
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Biodiesel (100%)'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '64').value = fuelVals.usage;
    //compressed natural gas
    //TODO: No Compressed Natural Gas CNG: issue 1418
    fuelVals = this.getFuelValue(fuelVals.usedFuels, [], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '65').value = fuelVals.usage;
    //liquified natural gas
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Liquefied Natural Gas (LNG)'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '66').value = fuelVals.usage;
    //ethanol fuel blend
    fuelVals = this.getFuelValue(fuelVals.usedFuels, ['Ethanol (100%)'], yearDetail.fuelTotals);
    worksheet.getCell(columnLetter + '67').value = fuelVals.usage;
    //row 68 and 69
    //Two rows, fill out both if two other fuels, otherwise just first row
    //other fuel (please specify)
    let otherFuelVals: { otherFuels: Array<string>, usage: number } = this.getOtherFuelValue(fuelVals.usedFuels, yearDetail.fuelTotals);
    if (otherFuelVals.otherFuels.length == 1 || otherFuelVals.otherFuels.length > 2) {
      //if 1 other fuel or more then 2. Put all values in row 63
      let cellName: string = 'Other Fuel ('
      otherFuelVals.otherFuels.forEach((fuel, index) => {
        cellName = cellName + fuel;
        if (index != otherFuelVals.otherFuels.length - 1) {
          cellName = cellName + ', ';
        }
      });
      cellName = cellName + ') (MMBtu)';
      worksheet.getCell('B68').value = cellName;
      worksheet.getCell(columnLetter + '68').value = otherFuelVals.usage;
    } else if (otherFuelVals.otherFuels.length == 2) {
      fuelVals = this.getFuelValue([], [otherFuelVals.otherFuels[0]], yearDetail.fuelTotals);
      worksheet.getCell(columnLetter + '68').value = fuelVals.usage;
      worksheet.getCell('B68').value = 'Other Fuel (' + otherFuelVals.otherFuels[0] + ') (MMBtu)';

      fuelVals = this.getFuelValue([], [otherFuelVals.otherFuels[1]], yearDetail.fuelTotals);
      worksheet.getCell(columnLetter + '69').value = fuelVals.usage;
      worksheet.getCell('B69').value = 'Other Fuel (' + otherFuelVals.otherFuels[1] + ') (MMBtu)';
    }

    //total energy use CALCULATED
    // worksheet.getCell(columnLetter + '70').value 

    //Section 5: Energy use for vehicles
    //Electricity use
    //TODO: Need to track electrical vehicles: issue 1419   
    let vehicleFuelVals: { usedFuels: Array<string>, usage: number } = { usedFuels: [], usage: 0 };
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, [], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '74').value = vehicleFuelVals.usage;
    //Gasoline
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, ['Gasoline', 'Gasoline (2-stroke)', 'Gasoline (4-stroke)'], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '75').value = vehicleFuelVals.usage;
    //Diesel
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, ['Diesel'], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '76').value = vehicleFuelVals.usage;
    //Biodiesel
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, ['Biodiesel'], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '77').value = vehicleFuelVals.usage;
    //compressed natural gas
    //TODO: Don't have Compressed Natural Gas: issue 1418
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, [], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '78').value = vehicleFuelVals.usage;
    //liquified natural gas
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, ['LPG'], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '79').value = vehicleFuelVals.usage;
    //ethanol fuel blend
    vehicleFuelVals = this.getFuelValue(vehicleFuelVals.usedFuels, ['Ethanol (100%)'], yearDetail.vehicleFuelTotals);
    worksheet.getCell(columnLetter + '80').value = vehicleFuelVals.usage;


    //other fuels
    //Two rows, fill out both if two other fuels, otherwise just first row
    let otherVehicleFuelVals: { otherFuels: Array<string>, usage: number } = this.getOtherFuelValue(vehicleFuelVals.usedFuels, yearDetail.vehicleFuelTotals);
    if (otherVehicleFuelVals.otherFuels.length == 1 || otherVehicleFuelVals.otherFuels.length > 2) {
      //if 1 other fuel or more then 2. Put all values in row 63
      let cellName: string = 'Other Fuel ('
      otherVehicleFuelVals.otherFuels.forEach((fuel, index) => {
        cellName = cellName + fuel;
        if (index != otherVehicleFuelVals.otherFuels.length - 1) {
          cellName = cellName + ', ';
        }
      });
      cellName = cellName + ') (MMBtu)';
      worksheet.getCell('B81').value = cellName;
      worksheet.getCell(columnLetter + '81').value = otherVehicleFuelVals.usage;
    } else if (otherVehicleFuelVals.otherFuels.length == 2) {
      fuelVals = this.getFuelValue([], [otherVehicleFuelVals.otherFuels[0]], yearDetail.fuelTotals);
      worksheet.getCell(columnLetter + '81').value = fuelVals.usage;
      worksheet.getCell('B81').value = 'Other Fuels (' + otherVehicleFuelVals.otherFuels[0] + ') (MMBtu)';

      fuelVals = this.getFuelValue([], [otherVehicleFuelVals.otherFuels[1]], yearDetail.fuelTotals);
      worksheet.getCell(columnLetter + '82').value = fuelVals.usage;
      worksheet.getCell('B82').value = 'Other Fuels (' + otherVehicleFuelVals.otherFuels[1] + ') (MMBtu)';
    }

    //total vehicle energy use CALCULATED
    // worksheet.getCell(columnLetter + '78').value 
  }


  getFuelValue(usedFuels: Array<string>, fuelTypes: Array<string>, fuelTotals: Array<{ fuelType: string, total: number }>): { usedFuels: Array<string>, usage: number } {
    let totalUsage: number = 0;
    fuelTypes.forEach(fuelType => {
      let fuelTotal: { fuelType: string, total: number } = fuelTotals.find(fuelTotal => {
        return fuelType == fuelTotal.fuelType;
      });
      if (fuelTotal) {
        totalUsage += fuelTotal.total;
        usedFuels.push(fuelType);
      }
    });
    return { usedFuels: usedFuels, usage: totalUsage };
  }

  getOtherFuelValue(usedFuels: Array<string>, fuelTotals: Array<{ fuelType: string, total: number }>): { otherFuels: Array<string>, usage: number } {
    let otherFuels: Array<string> = [];
    let totalUsage: number = 0;
    fuelTotals.forEach(fuelTotal => {
      if (!usedFuels.includes(fuelTotal.fuelType)) {
        otherFuels.push(fuelTotal.fuelType);
        totalUsage += fuelTotal.total
      }
    });

    return {
      otherFuels: otherFuels,
      usage: totalUsage
    }

  }

  getFiscalYearEnd(fiscalYearMonth: number): string {
    switch (fiscalYearMonth) {
      case 0: {
        return 'January 31'
      }
      case 1: {
        return 'February 29'
      }
      case 2: {
        return 'March 31'
      }
      case 3: {
        return 'April 30'
      }
      case 4: {
        return 'May 31'
      }
      case 5: {
        return 'June 30'
      }
      case 6: {
        return 'July 31'
      }
      case 7: {
        return 'August 31'
      }
      case 7: {
        return 'September 30'
      }
      case 7: {
        return 'October 31'
      }
      case 7: {
        return 'November 30'
      }
      default: {
        return 'Calendar Year (December 31)'
      }
    }
  }


  writeFacilityEmissions(workbook: ExcelJS.Workbook, report: IdbAccountReport, betterClimateReport: BetterClimateReport) {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Facility Emissions');
    //C6 Reporting Year
    worksheet.getCell('C6').value = report.reportYear;
    //start row 9
    let rowIndex: number = 9;
    betterClimateReport.annualFacilitiesSummaries.forEach(facilitySummary => {
      //B: Facility Name
      worksheet.getCell('B' + rowIndex).value = facilitySummary.facility.name;
      //C: Sq. Ft
      worksheet.getCell('C' + rowIndex).value = facilitySummary.facility.size;
      //D: Latitude
      // worksheet.getCell('B' + rowIndex).value = facilitySummary.facility;
      //E: Longitude
      // worksheet.getCell('B' + rowIndex).value = facilitySummary.facility;
      let reportYearDetail: BetterClimateYearDetails = facilitySummary.betterClimateYearDetails.find(yDetail => {
        return yDetail.year == report.reportYear;
      });
      if (reportYearDetail) {
        //F: Scope 1 Emissions
        worksheet.getCell('F' + rowIndex).value = reportYearDetail.emissionsResults.totalScope1Emissions;
        //G: Scope 2 location-based emissions
        worksheet.getCell('G' + rowIndex).value = reportYearDetail.emissionsResults.scope2LocationEmissions;
        //H: Scope 2 market-based emissions
        worksheet.getCell('H' + rowIndex).value = reportYearDetail.emissionsResults.scope2MarketEmissions;
      }
      rowIndex++;
    })
  }

  writeReductionInitiatives(workbook: ExcelJS.Workbook, report: IdbAccountReport) {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Emissions Reduction Initiatives');
    let rowIndex: number = 7;
    report.betterClimateReportSetup.initiativeNotes.forEach(iNote => {
      //B: year
      worksheet.getCell('B' + rowIndex).value = iNote.year;
      //C: note
      worksheet.getCell('C' + rowIndex).value = iNote.note;
      rowIndex++;
    });
  }
}
