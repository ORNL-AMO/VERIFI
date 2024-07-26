import { WorkBook } from "xlsx"
import { IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from "../models/idb"
import { IdbFacility } from "../models/idbModels/facility"

export interface FileReference {
    name: string,
    // type: '.csv' | '.xlsx',
    file: File,
    dataSubmitted: boolean,
    id: string,
    workbook: WorkBook,
    isTemplate: boolean,
    selectedWorksheetName: string,
    selectedWorksheetData: Array<Array<string>>,
    columnGroups: Array<ColumnGroup>,
    meterFacilityGroups: Array<FacilityGroup>,
    predictorFacilityGroups: Array<FacilityGroup>,
    headerMap: Array<any>,
    importFacilities: Array<IdbFacility>,
    meters: Array<IdbUtilityMeter>,
    meterData: Array<IdbUtilityMeterData>,
    predictorEntries: Array<IdbPredictorEntry>,
    skipExistingReadingsMeterIds: Array<string>
    skipExistingPredictorFacilityIds: Array<string>,
    newMeterGroups: Array<IdbUtilityMeterGroup>,
    selectedFacilityId: string
  }
  
  export interface ColumnGroup {
    groupLabel: string,
    groupItems: Array<ColumnItem>,
    id: string
  }
  
  export interface FacilityGroup {
    facilityId: string,
    groupItems: Array<ColumnItem>,
    facilityName: string,
    color: string
  }
  
  export interface ColumnItem {
    index: number,
    value: string,
    id: string,
    isProductionPredictor?: boolean,
    isExisting?: boolean
    // fileName?: string
  }
  
  
  export interface ParsedTemplate {
    importFacilities: Array<IdbFacility>,
    importMeters: Array<IdbUtilityMeter>,
    predictorEntries: Array<IdbPredictorEntry>,
    meterData: Array<IdbUtilityMeterData>,
    newGroups: Array<IdbUtilityMeterGroup>
  }