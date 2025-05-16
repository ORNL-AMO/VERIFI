import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { checkShowHeatCapacity, getIsEnergyUnit } from '../sharedHelperFuntions';
import { ScopeOption, ScopeOptions } from 'src/app/models/scopeOption';
import { AgreementType, AgreementTypes } from 'src/app/models/agreementType';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { VehicleTypes } from '../vehicle-data/vehicleType';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from 'src/app/models/globalWarmingPotentials';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter, MeterReadingDataApplication } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { checkSameMonth } from 'src/app/upload-data/upload-helper-functions';


@Injectable({
  providedIn: 'root'
})
export class ExportToNewTemplateService {

  constructor(private loadingService: LoadingService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictorDbService, private predictorDataDbService: PredictorDataDbService
  ) { }

  async exportFacilityData(facilityId?: string) {

    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/csv_templates/VERIFI_NewTemplate.xlsx', true);
    request.responseType = 'blob';

    request.onload = async () => {
      try {
        // Load the workbook
        await workbook.xlsx.load(request.response);
        // console.log('Workbook loaded successfully');

        // Validate workbook structure
        if (workbook.worksheets.length === 0) {
          throw new Error('No worksheets found in the workbook');
        }

        // Process the workbook (e.g., fill data)
        this.fillWorkbook(workbook, facilityId);
        // console.log('Workbook filled successfully', workbook);

        // Write the workbook to a buffer
        const excelData = await workbook.xlsx.writeBuffer();
        // console.log('Workbook written successfully');

        // Trigger download (optional)
        const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = 'Test-New-Template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.loadingService.setLoadingStatus(false);
      } catch (error) {
        console.error('Error processing workbook:', error);
        this.loadingService.setLoadingStatus(false);
      }
    };
    this.loadingService.setLoadingMessage('Exporting to .xlsx template');
    this.loadingService.setLoadingStatus(true);
    request.send();
  }


  fillWorkbook(workbook: ExcelJS.Workbook, facilityId?: string) {
    this.setFacilityWorksheet(workbook, facilityId);
    this.setHiddenElectricityWorksheet(workbook);
    this.setElectricityMetersWorksheet(workbook, facilityId);
  }

  setFacilityWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Facilities');
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      accountFacilities = accountFacilities.filter(facility => { return facility.guid == facilityId });
    }
    let index: number = 3;
    accountFacilities.forEach(facility => {
      //A: Facility Name
      worksheet.getCell('A' + index).value = facility.name;
      //B: Address
      worksheet.getCell('B' + index).value = facility.address;
      //C: Country
      worksheet.getCell('C' + index).value = this.getCountry(facility);
      //D: State
      worksheet.getCell('D' + index).value = facility.state;
      //E: City
      worksheet.getCell('E' + index).value = facility.city;
      //F: Zip
      worksheet.getCell('F' + index).value = facility.zip;
      //G: NAICS Code 2 Digit
      worksheet.getCell('G' + index).value = facility.naics2;
      //H: NAICS Code 3 Digit
      worksheet.getCell('H' + index).value = facility.naics3;
      //I: Contact Name
      worksheet.getCell('I' + index).value = facility.contactName;
      //J: Contact Phone
      worksheet.getCell('J' + index).value = facility.contactPhone;
      //K: Contact Email
      worksheet.getCell('K' + index).value = facility.contactEmail;
      index++;
    })
    return worksheet;
  }

  getCountry(facility: IdbFacility): string {
    if (facility.country) {
      return facility.country;
    } else if (facility.state) {
      return 'United States of America (the)';
    };
    return;
  }

  setHiddenElectricityWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    let worksheet = workbook.getWorksheet('HIDE_ELEC');
    //filter with @ symbol
    // worksheet.getCell('A16').value = { formula: '_xlfn._xlws.FILTER(Facilities!$A:$A,(Facilities!$A:$A<>"")*(Facilities!$A:$A<>"Facility Name")*(Facilities!$A:$A<>"√ Facility Setup"))'};
    return worksheet;
  }

  setElectricityMetersWorksheet(workbook: ExcelJS.Workbook, facilityId?: string): ExcelJS.Worksheet {
    let worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Electricity Meters');
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      facilityMeters = facilityMeters.filter(meter => { return meter.facilityId == facilityId });
    }
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let electricityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == 'Electricity' });
    let index: number = 3;
    electricityMeters.forEach(meter => {
      let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == meter.facilityId });
      let cell = worksheet.getCell('A' + index);
      cell.value = facility.name;
      let validationFormula = 'HIDE_ELEC!$A$16:A50';
      // validationFormula = `\"${validationFormula}\"`;
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [validationFormula],
        // showErrorMessage: true,
        // errorTitle: 'Invalid Selection',
        // error: 'Please select a valid country from the dropdown.',
      };
      worksheet.getCell('B' + index).value = 'METER_' + index;
      worksheet.getCell('C' + index).value = meter.name;
    });
    return worksheet

  }
}
