import { Injectable } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import * as XLSX from 'xlsx';
import { ParsedTemplate } from './upload-data-models';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getCountryCode, getState, getZip, parseNAICs } from './upload-helper-functions';
import * as _ from 'lodash';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { SubRegionData } from 'src/app/models/eGridEmissions';
@Injectable({
  providedIn: 'root'
})
export class UploadDataV3Service {

  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService
  ) { }

  parseTemplate(workbook: XLSX.WorkBook): ParsedTemplate {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let importFacilities: Array<IdbFacility> = this.getImportFacilities(workbook, selectedAccount);
    if (importFacilities.length == 0) {
      throw ('No Facilities Found!')
    } else {
      // let importMetersAndGroups: { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } = this.getImportMeters(workbook, importFacilities, selectedAccount);
      // let importMeterData: Array<IdbUtilityMeterData> = this.getUtilityMeterData(workbook, importMetersAndGroups.meters);
      // let importPredictors: Array<IdbPredictor> = this.uploadDataSharedFunctionsService.getPredictors(workbook, importFacilities);
      // let importPredictorData: Array<IdbPredictorData> = this.uploadDataSharedFunctionsService.getPredictorData(workbook, importFacilities, importPredictors);
      let importMetersAndGroups: { meters: Array<IdbUtilityMeter>, newGroups: Array<IdbUtilityMeterGroup> } = { meters: [], newGroups: [] };
      let importMeterData: Array<IdbUtilityMeterData> = [];
      let importPredictors: Array<IdbPredictor> = [];
      let importPredictorData: Array<IdbPredictorData> = [];

      return { importFacilities: importFacilities, importMeters: importMetersAndGroups.meters, predictors: importPredictors, predictorData: importPredictorData, meterData: importMeterData, newGroups: importMetersAndGroups.newGroups }
    }
  }

  getImportFacilities(workbook: XLSX.WorkBook, selectedAccount: IdbAccount): Array<IdbFacility> {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities'], { range: 1 });
    let importFacilities: Array<IdbFacility> = new Array();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();
    facilitiesData.forEach(facilityDataRow => {
      let facilityName: string = facilityDataRow['Facility Name'];
      if (facilityName) {
        let facility: IdbFacility = accountFacilities.find(facility => { return facility.name == facilityName });
        if (!facility) {
          facility = getNewIdbFacility(selectedAccount);
          facility.name = facilityName;
        }
        facility.address = facilityDataRow['Address'];
        facility.country = getCountryCode(facilityDataRow['Country']);
        facility.state = getState(facilityDataRow['US State']);
        facility.city = facilityDataRow['City'];
        facility.zip = getZip(facilityDataRow['ZIP Code']);
        facility.naics1 = parseNAICs(facilityDataRow['NAICS Code (2-digit)']);
        facility.naics2 = parseNAICs(facilityDataRow['NAICS Code (3-digit)']);
        facility.contactName = facilityDataRow['Contact Name'];
        facility.contactPhone = facilityDataRow['Contact Phone'];
        facility.contactEmail = facilityDataRow['Contact Email'];
        if (facility.zip && facility.zip.length == 5) {
          let subRegionData: SubRegionData = _.find(this.eGridService.subRegionsByZipcode, (val) => { return val.zip == facility.zip });
          if (subRegionData) {
            if (subRegionData.subregions.length != 0) {
              facility.eGridSubregion = subRegionData.subregions[0]
            }
          }
        }
        importFacilities.push(facility);
      }
    });
    return importFacilities;
  }
}
