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

  constructor(private loadingService: LoadingService, private accountDbService: AccountdbService) { }

  exportFacilityData(facilityId?: string) {

    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    request.open('GET', 'assets/csv_templates/VERIFI_NewTemplate.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        // this.fillWorkbook(workbook, facilityId);
        // workbook.xlsx.writeBuffer().then(excelData => {
        //   let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        //   let a = document.createElement("a");
        //   let url = window.URL.createObjectURL(blob);
        //   a.href = url;
        //   // let date = new Date();
        //   // let datePipe = new DatePipe('en-us');
        //   // let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        //   // let accountName: string = account.name;
        //   // accountName = accountName.replaceAll(' ', '-');
        //   // accountName = accountName.replaceAll('.', '_');
        //   a.download = "Test-New-Template";
        //   document.body.appendChild(a);
        //   a.click();
        //   window.URL.revokeObjectURL(url);
        //   document.body.removeChild(a);
        //   this.loadingService.setLoadingStatus(false);
        // });
        console.log(workbook);
        this.loadingService.setLoadingStatus(false);
      })
    };
    this.loadingService.setLoadingMessage('Exporting to .xlsx template');
    this.loadingService.setLoadingStatus(true);
    request.send();
  }
}
