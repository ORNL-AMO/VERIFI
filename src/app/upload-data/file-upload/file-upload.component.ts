import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColumnItem, FacilityGroup, FileReference, UploadDataService } from '../upload-data.service';
import * as XLSX from 'xlsx';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

  fileReferences: Array<FileReference>;
  disableImport: boolean = false;
  filesUploaded: boolean = false;
  constructor(private router: Router, private uploadDataService: UploadDataService, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.fileReferences = new Array();
  }

  setImportFile(files: FileList) {
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {

            this.addFile(files[index]);
          }
        }
      }
    }
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
  }

  continue() {
    this.uploadDataService.fileReferences = this.fileReferences;
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id);
  }

  addFile(file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      let isTemplate: boolean = this.checkSheetNamesForTemplate(workBook.SheetNames);
      if (!isTemplate) {
        this.fileReferences.push({
          name: file.name,
          file: file,
          dataSet: false,
          id: Math.random().toString(36).substr(2, 9),
          workbook: workBook,
          isTemplate: isTemplate,
          selectedWorksheetName: workBook.Workbook.Sheets[0].name,
          selectedWorksheetData: [],
          columnGroups: [],
          meterFacilityGroups: [],
          predictorFacilityGroups: [],
          headerMap: [],
          importFacilities: []
        });
      } else {
        //parse template
        let templateData: { importFacilities: Array<IdbFacility>, importMeters: Array<IdbUtilityMeter>, predictorEntries: Array<IdbPredictorEntry> } = this.parseTemplate(workBook);
        let meterFacilityGroups: Array<FacilityGroup> = this.getMeterFacilityGroups(templateData);
        let predictorFacilityGroups: Array<FacilityGroup> = this.getPredictorFacilityGroups(templateData);
        this.fileReferences.push({
          name: file.name,
          file: file,
          dataSet: false,
          id: Math.random().toString(36).substr(2, 9),
          workbook: workBook,
          isTemplate: isTemplate,
          selectedWorksheetName: undefined,
          selectedWorksheetData: [],
          columnGroups: [],
          meterFacilityGroups: meterFacilityGroups,
          predictorFacilityGroups: predictorFacilityGroups,
          headerMap: [],
          importFacilities: templateData.importFacilities
        });
      }
    };
    reader.readAsBinaryString(file);
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): boolean {
    if (sheetNames[0] == "Help" && sheetNames[1] == 'Facilities' && sheetNames[2] == "Meters-Utilities" && sheetNames[3] == "Electricity" && sheetNames[4] == "Non-electricity" && sheetNames[5] == "Predictors") {
      return true;
    } else {
      return false;
    }
  }

  parseTemplate(workbook: XLSX.WorkBook): { importFacilities: Array<IdbFacility>, importMeters: Array<IdbUtilityMeter>, predictorEntries: Array<IdbPredictorEntry> } {
    let facilitiesData = XLSX.utils.sheet_to_json(workbook.Sheets['Facilities']);
    let importFacilities: Array<IdbFacility> = new Array();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    facilitiesData.forEach(facilityDataRow => {
      let facilityName: string = facilityDataRow['Facility Name'];
      let facility: IdbFacility = accountFacilities.find(facility => { return facility.name == facilityName });
      if (!facility) {
        facility = this.facilityDbService.getNewIdbFacility(selectedAccount);
      }
      facility.address = facilityDataRow['Address'];
      facility.country = facilityDataRow['Country'];
      facility.state = facilityDataRow['State'];
      facility.city = facilityDataRow['City'];
      facility.zip = facilityDataRow['Zip'];
      facility.naics2 = facilityDataRow['NAICS Code 2'];
      facility.naics3 = facilityDataRow['NAICS Code 3'];
      facility.contactName = facilityDataRow['Contact Name'];
      facility.contactPhone = facilityDataRow['Contact Phone'];
      facility.contactEmail = facilityDataRow['Contact Email'];
      importFacilities.push(facility);
    })
    let metersData = XLSX.utils.sheet_to_json(workbook.Sheets['Meters-Utilities']);
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let importMeters: Array<IdbUtilityMeter> = new Array();
    metersData.forEach(meterData => {
      let facilityName: string = meterData['Facility Name'];
      let facility: IdbFacility = importFacilities.find(facility => { return facility.name == facilityName });
      let meterNumber: string = meterData['Meter Number'];
      let meter: IdbUtilityMeter = accountMeters.find(aMeter => { return aMeter.meterNumber == meterNumber });
      if (!meter) {
        meter = this.utilityMeterDbService.getNewIdbUtilityMeter(facility.guid, selectedAccount.guid, true, meterData['Collection Unit']);
      }
      meter.meterNumber = meterNumber;
      meter.accountNumber = meterData['Account Number'];
      meter.source = meterData['Source'];
      meter.name = meterData['Meter Name'];
      meter.supplier = meterData['Utility Supplier'];
      meter.notes = meterData['Notes'];
      meter.location = meterData['Building / Location'];
      //TODO: group, phase, fuel
      meter.group = meterData['Meter Group'];
      meter.phase = meterData['Phase'];
      meter.fuel = meterData['Fuel'];
      meter.startingUnit = meterData['Collection Unit'];
      meter.heatCapacity = meterData['Heat Capacity'];
      meter.siteToSource = meterData['Site To Source'];
      //TODO: scope, agreementType
      meter.scope = meterData['Scope']
      meter.agreementType = meterData['Agreement Type'];
      //TODO: yes/no
      meter.includeInEnergy = meterData['Include In Energy'];
      meter.retainRECs = meterData['Retain RECS'];
      importMeters.push(meter);
    })
    // let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity'], { header: 1 });
    // let noElectricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Non-electricity'], { header: 1 });
    let predictorsData = XLSX.utils.sheet_to_json(workbook.Sheets['Predictors']);
    let predictorEntries: Array<IdbPredictorEntry> = new Array();
    importFacilities.forEach(facility => {
      let facilityPredictorEntry: IdbPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(facility.guid, selectedAccount.guid, new Date());
      let facilityPredictorData = predictorsData.filter(data => { return data['Facility Name'] == facility.name });
      if (facilityPredictorData.length != 0) {
        Object.keys(facilityPredictorData[0]).forEach((key) => {
          if (key != 'Facility Name' && key != 'Date') {
            let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
            newPredictor.name = key;
            facilityPredictorEntry.predictors.push(newPredictor);
          }
        });
        if (facilityPredictorEntry.predictors.length != 0) {
          predictorEntries.push(facilityPredictorEntry);
        }
      }
    })


    return { importFacilities: importFacilities, importMeters: importMeters, predictorEntries: predictorEntries }
  }

  getMeterFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, importMeters: Array<IdbUtilityMeter> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;

    // facilityGroups.push({
    //   facilityId: Math.random().toString(36).substr(2, 9),
    //   groupItems: [],
    //   facilityName: 'Unmapped Meters',
    //   color: ''
    // })
    templateData.importFacilities.forEach(facility => {
      let facilityMeters: Array<IdbUtilityMeter> = templateData.importMeters.filter(meter => { return meter.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      facilityMeters.forEach(meter => {
        groupItems.push({
          index: meterIndex,
          value: meter.name,
          id: meter.guid,
        });
        meterIndex++;
      })
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: groupItems,
        facilityName: facility.name,
        color: facility.color
      });
    });
    return facilityGroups;
  }


  getPredictorFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, predictorEntries: Array<IdbPredictorEntry> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let predictorIndex: number = 0;

    // facilityGroups.push({
    //   facilityId: Math.random().toString(36).substr(2, 9),
    //   groupItems: [],
    //   facilityName: 'Unmapped Predictors',
    //   color: ''
    // })
    templateData.importFacilities.forEach(facility => {
      let facilityPredictorEntry: IdbPredictorEntry = templateData.predictorEntries.find(entry => { return entry.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      facilityPredictorEntry.predictors.forEach(predictor => {
        groupItems.push({
          index: predictorIndex,
          value: predictor.name,
          id: predictor.id,
        });
        predictorIndex++;
      })
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: groupItems,
        facilityName: facility.name,
        color: facility.color
      });
    });
    return facilityGroups;
  }
}
