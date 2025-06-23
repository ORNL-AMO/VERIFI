import { WorkBook } from "xlsx"
import { IdbFacility } from "../models/idbModels/facility"
import { IdbUtilityMeter } from "../models/idbModels/utilityMeter"
import { IdbUtilityMeterData } from "../models/idbModels/utilityMeterData"
import { IdbUtilityMeterGroup } from "../models/idbModels/utilityMeterGroup"
import { IdbPredictor } from "../models/idbModels/predictor"
import { IdbPredictorData } from "../models/idbModels/predictorData"

export interface FileReference {
  name: string,
  // type: '.csv' | '.xlsx',
  file: File,
  dataSubmitted: boolean,
  id: string,
  workbook: WorkBook,
  isTemplate: boolean,
  isTreasureHuntTemplate: boolean,
  selectedWorksheetName: string,
  selectedWorksheetData: Array<Array<string>>,
  columnGroups: Array<ColumnGroup>,
  meterFacilityGroups: Array<FacilityGroup>,
  predictorFacilityGroups: Array<FacilityGroup>,
  headerMap: Array<any>,
  importFacilities: Array<IdbFacility>,
  meters: Array<IdbUtilityMeter>,
  meterData: Array<IdbUtilityMeterData>,
  // predictorEntries: Array<IdbPredictorEntry>,
  predictors: Array<IdbPredictor>,
  predictorData: Array<IdbPredictorData>,
  skipExistingReadingsMeterIds: Array<string>
  skipExistingPredictorFacilityIds: Array<string>,
  newMeterGroups: Array<IdbUtilityMeterGroup>,
  selectedFacilityId: string
}

export function getEmptyFileReference(): FileReference {
  return {
    name: '',
    file: undefined,
    dataSubmitted: false,
    id: undefined,
    workbook: undefined,
    isTemplate: false,
    isTreasureHuntTemplate: false,
    selectedWorksheetName: '',
    selectedWorksheetData: [],
    columnGroups: [],
    headerMap: [],
    meterFacilityGroups: [],
    predictorFacilityGroups: [],
    importFacilities: [],
    meters: [],
    meterData: [],
    predictors: [],
    predictorData: [],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
}

export interface ColumnGroup {
  groupLabel: string,
  groupItems: Array<ColumnItem>,
  id: string,
  dragDropClass?: string
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
  predictors: Array<IdbPredictor>,
  predictorData: Array<IdbPredictorData>,
  meterData: Array<IdbUtilityMeterData>,
  newGroups: Array<IdbUtilityMeterGroup>
}