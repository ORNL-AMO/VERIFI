import { Injectable } from '@angular/core';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor, IdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '@data/models/idbModels/predictorData';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { checkSameDate, getNewIdbUtilityMeterData, IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getMeterDataCopy } from '@domain/calculations/conversions/convertMeterData';
import { EnergyUnitsHelperService } from '@shared/helper-services/energy-units-helper.service';
import {
  checkShowHeatCapacity,
  checkShowSiteToSource,
  getHeatingCapacity,
  getIsEnergyMeter,
  getIsEnergyUnit,
  getSiteToSource
} from '@shared/sharedHelperFunctions';
import { setPredictorDateDataFromDate } from '@shared/dateHelperFunctions';
import * as XLSX from 'xlsx';
import { applyMeterMultipliers } from './meter-import-defaults';
import { UploadDataEnergyTreasureHuntService } from './parsers/upload-data-energy-treasure-hunt.service';
import { UploadDataFootprintToolService } from './parsers/upload-data-footprint-tool.service';
import { UploadDataV1Service } from './parsers/upload-data-v1.service';
import { UploadDataV2Service } from './parsers/upload-data-v2.service';
import { UploadDataV3Service } from './parsers/upload-data-v3.service';
import {
  ColumnGroup,
  ColumnItem,
  FacilityGroup,
  ImportFileDraft,
  ImportFileKind,
  ParsedTemplate,
  TemplateVersion
} from './spreadsheet-import.models';
import { checkSameMonthPredictorData } from './upload-helper-functions';

@Injectable({ providedIn: 'root' })
export class SpreadsheetImportDraftService {

  constructor(
    private readonly store: AccountWorkspaceStore,
    private readonly query: AccountWorkspaceQueryService,
    private readonly energyUnits: EnergyUnitsHelperService,
    private readonly v1Parser: UploadDataV1Service,
    private readonly v2Parser: UploadDataV2Service,
    private readonly v3Parser: UploadDataV3Service,
    private readonly treasureHuntParser: UploadDataEnergyTreasureHuntService,
    private readonly footprintParser: UploadDataFootprintToolService
  ) { }

  async readFile(file: File): Promise<ImportFileDraft> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    return this.createDraft(file, workbook);
  }

  createDraft(file: File, workbook: XLSX.WorkBook): ImportFileDraft {
    const version = this.detectVersion(workbook.SheetNames);
    const kind = this.kindForVersion(version);
    const parsed = version === 'Non-template' ? this.emptyParsed() : this.parseTemplate(workbook, version);
    const facilities = version === 'Non-template'
      ? this.store.facilities().map(facility => ({ ...facility }))
      : parsed.importFacilities;
    const selectedWorksheetName = this.visibleWorksheetNames(workbook)[0] ?? workbook.SheetNames[0];
    const draft: ImportFileDraft = {
      name: file.name,
      file,
      dataSubmitted: false,
      id: crypto.randomUUID(),
      workbook,
      isTemplate: ['V1', 'V2', 'V3', 'ETH'].includes(version),
      isTreasureHuntTemplate: version === 'ETH',
      isFootprintToolTemplate: version === 'Footprint-tool',
      selectedWorksheetName,
      selectedWorksheetData: [],
      columnGroups: [],
      meterFacilityGroups: [],
      predictorFacilityGroups: this.getFacilityGroups(facilities, parsed.predictors, 'predictor'),
      headerMap: [],
      importFacilities: facilities,
      meters: parsed.importMeters,
      meterData: parsed.meterData,
      predictors: parsed.predictors,
      predictorData: parsed.predictorData,
      skipExistingReadingsMeterIds: [],
      skipExistingPredictorFacilityIds: [],
      newMeterGroups: parsed.newGroups,
      selectedFacilityId: facilities.length === 1 ? facilities[0].guid : undefined,
      facilityEnergyUseGroups: parsed.energyUseGroups,
      facilityEnergyUseEquipment: parsed.energyUseEquipment,
      kind,
      status: 'ready',
      findings: [],
      completedSteps: [],
      invalidMeterReadingsAcknowledged: false,
      excludedMeterReadingIds: []
    };
    if (version === 'Non-template') this.selectWorksheet(draft, selectedWorksheetName);
    return draft;
  }

  detectVersion(sheetNames: string[]): TemplateVersion {
    const v2Legacy = ['V2', 'Help', 'HIDE_Lists', 'HIDE_Meter_Lists', 'Facilities', 'Meters-Utilities', 'HIDE_Meters-Utilites', 'Electricity', 'Stationary Fuel - Other Energy', 'Mobile Fuel', 'Water', 'Other Utility - Emission', 'Predictors', 'Fix Me', 'HIDE_NAICS3'];
    const v2Current = ['V2', 'Getting Started', 'HIDE_Lists', 'HIDE_Meter_Lists', 'Facilities', 'Meters-Utilities', 'HIDE_Meters-Utilites', 'Electricity', 'Stationary Fuel - Other Energy', 'Mobile Fuel', 'Water', 'Other Utility - Emission', 'Predictors', 'Troubleshooting', 'HIDE_NAICS3'];
    if (this.startsWith(sheetNames, v2Legacy) || this.startsWith(sheetNames, v2Current)) return 'V2';
    if (this.startsWith(sheetNames, ['Help', 'Facilities', 'Meters-Utilities', 'Electricity', 'Non-electricity', 'Predictors'])) return 'V1';
    if (sheetNames.includes('ETH VERIFI Upload')) return 'ETH';
    if (sheetNames.includes('V3')) return 'V3';
    if (['Energy Consumption', 'Energy Uses', 'Relevant Variables'].every(name => sheetNames.includes(name))) return 'Footprint-tool';
    return 'Non-template';
  }

  visibleWorksheetNames(workbook: XLSX.WorkBook, includeHidden = false): string[] {
    const sheetMetadata = workbook.Workbook?.Sheets;
    if (!sheetMetadata) return [...workbook.SheetNames];
    return sheetMetadata
      .filter(sheet => includeHidden || sheet.Hidden !== 1)
      .map(sheet => sheet.name);
  }

  selectWorksheet(draft: ImportFileDraft, worksheetName: string): void {
    const worksheet = draft.workbook.Sheets[worksheetName];
    if (!worksheet) throw new Error(`Worksheet "${worksheetName}" was not found.`);
    draft.selectedWorksheetName = worksheetName;
    draft.selectedWorksheetData = XLSX.utils.sheet_to_json<Array<string>>(worksheet, { header: 1 });
    if (draft.selectedWorksheetData.length === 0) {
      draft.columnGroups = [];
      draft.headerMap = [];
      draft.findings = [{ severity: 'error', sheet: worksheetName, message: 'The worksheet is empty.', action: 'Choose a worksheet with a header row and data.' }];
      return;
    }
    const headers = draft.selectedWorksheetData[0].map(value => String(value ?? '').trim());
    draft.selectedWorksheetData[0] = headers;
    draft.headerMap = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet).map(row =>
      Object.keys(row).reduce((result, key) => {
        result[key.trim()] = row[key];
        return result;
      }, {} as Record<string, unknown>)
    );
    const items = headers.filter(Boolean).map((value, index) => ({ value, index, id: crypto.randomUUID() }));
    const date = items.find(item => item.value === 'Date');
    draft.columnGroups = [
      this.columnGroup('Worksheet Columns', items.filter(item => item !== date)),
      this.columnGroup('Meters', []),
      this.columnGroup('Predictors', []),
      this.columnGroup('Date', date ? [date] : [])
    ];
    draft.meterFacilityGroups = [];
    draft.predictorFacilityGroups = [];
    draft.findings = [];
  }

  assignColumn(draft: ImportFileDraft, itemId: string, target: 'Worksheet Columns' | 'Meters' | 'Predictors' | 'Date'): void {
    let item: ColumnItem;
    for (const group of draft.columnGroups) {
      const index = group.groupItems.findIndex(candidate => candidate.id === itemId);
      if (index >= 0) item = group.groupItems.splice(index, 1)[0];
    }
    if (!item) return;
    const targetGroup = draft.columnGroups.find(group => group.groupLabel === target);
    if (target === 'Date' && targetGroup.groupItems.length) {
      const prior = targetGroup.groupItems.pop();
      draft.columnGroups.find(group => group.groupLabel === 'Worksheet Columns').groupItems.push(prior);
    }
    targetGroup.groupItems.push(item);
    draft.meterFacilityGroups = [];
    draft.predictorFacilityGroups = [];
  }

  initializeFacilityMappings(draft: ImportFileDraft): void {
    draft.meterFacilityGroups = this.mappingGroups(draft, 'Meters', 'Unmapped Meters');
    draft.predictorFacilityGroups = this.mappingGroups(draft, 'Predictors', 'Unmapped Predictors');
  }

  mapColumnToFacility(draft: ImportFileDraft, type: 'meter' | 'predictor', itemId: string, facilityId?: string): void {
    const groups = type === 'meter' ? draft.meterFacilityGroups : draft.predictorFacilityGroups;
    let item: ColumnItem;
    groups.forEach(group => {
      const index = group.groupItems.findIndex(candidate => candidate.id === itemId);
      if (index >= 0) item = group.groupItems.splice(index, 1)[0];
    });
    const target = groups.find(group => facilityId ? group.facilityId === facilityId : group.facilityName.startsWith('Unmapped'));
    if (item && target) target.groupItems.push(item);
    this.materializeGeneralRecords(draft);
  }

  materializeGeneralRecords(draft: ImportFileDraft): void {
    draft.meters = this.parseMeters(draft);
    draft.meterData = this.parseMeterReadings(draft);
    const predictorResult = this.parsePredictors(draft);
    draft.predictors = predictorResult.predictors;
    draft.predictorData = predictorResult.readings;
  }

  applyFootprintFacility(draft: ImportFileDraft, facilityId: string): void {
    draft.selectedFacilityId = facilityId;
    this.footprintParser.setSelectedFacility(draft);
  }

  private parseTemplate(workbook: XLSX.WorkBook, version: TemplateVersion): ParsedTemplate {
    if (version === 'V1') return this.v1Parser.parseTemplate(workbook);
    if (version === 'V2') return this.v2Parser.parseTemplate(workbook);
    if (version === 'V3') return this.v3Parser.parseTemplate(workbook);
    if (version === 'ETH') return this.treasureHuntParser.parseTemplate(workbook);
    if (version === 'Footprint-tool') return this.footprintParser.parseTemplate(workbook);
    return this.emptyParsed();
  }

  private parseMeters(draft: ImportFileDraft): IdbUtilityMeter[] {
    const existingMeters = this.query.getAccountMetersCopy();
    const meters: IdbUtilityMeter[] = [];
    draft.meterFacilityGroups.filter(group => !group.facilityName.startsWith('Unmapped')).forEach(group => {
      const facility = draft.importFacilities.find(value => value.guid === group.facilityId);
      group.groupItems.forEach(item => {
        const existing = existingMeters.find(value => value.facilityId === facility.guid && value.name === item.value);
        meters.push(existing ? { ...existing, importWizardName: item.value } : this.newMeter(item, facility));
      });
    });
    return meters;
  }

  private newMeter(item: ColumnItem, facility: IdbFacility): IdbUtilityMeter {
    let meter = getNewIdbUtilityMeter(facility.guid, facility.accountId, false, facility.energyUnit);
    const fuelType = this.energyUnits.parseFuelType(item.value);
    if (fuelType) {
      meter.source = 'Other Fuels';
      meter.phase = fuelType.phase;
      meter.scope = 1;
      meter.fuel = fuelType.fuelTypeOption.value;
      meter.heatCapacity = fuelType.fuelTypeOption.heatCapacityValue;
      meter.siteToSource = fuelType.fuelTypeOption.siteToSourceMultiplier;
      meter.startingUnit = this.energyUnits.parseStartingUnit(item.value) ?? fuelType.fuelTypeOption.startingUnit;
    } else {
      meter.source = this.energyUnits.parseSource(item.value);
      meter.startingUnit = this.energyUnits.parseStartingUnit(item.value);
      if (meter.source === 'Electricity') {
        meter.scope = 3;
        if (!meter.startingUnit || !getIsEnergyUnit(meter.startingUnit)) meter.startingUnit = 'kWh';
      } else if (meter.source === 'Natural Gas') meter.scope = 1;
      else if (meter.source === 'Other Energy') meter.scope = 4;
    }
    if (meter.startingUnit && meter.source) {
      meter.energyUnit = getIsEnergyUnit(meter.startingUnit) ? meter.startingUnit : facility.energyUnit;
      if (checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope)) {
        meter.heatCapacity = getHeatingCapacity(meter.source, meter.startingUnit, meter.energyUnit);
      }
      if (checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope)) meter.siteToSource = getSiteToSource(meter.source);
    }
    meter.name = item.value;
    meter.importWizardName = item.value;
    meter.meterNumber = `${facility.name.replace(' ', '_')}_${meter.source?.replace(' ', '_')}_${crypto.randomUUID().slice(0, 3)}`;
    return applyMeterMultipliers(meter);
  }

  private parseMeterReadings(draft: ImportFileDraft): IdbUtilityMeterData[] {
    const dateColumn = draft.columnGroups.find(group => group.groupLabel === 'Date')?.groupItems[0]?.value;
    if (!dateColumn) return [];
    const existing = this.store.meterData().map(reading => getMeterDataCopy(reading));
    const result: IdbUtilityMeterData[] = [];
    draft.meters.filter(meter => !meter.skipImport).forEach(meter => draft.headerMap.forEach(row => {
      const date = new Date(row[dateColumn] as any);
      if (isNaN(date.valueOf())) return;
      const reading = existing.find(value => value.meterId === meter.guid && checkSameDate(date, value))
        ?? getNewIdbUtilityMeterData(meter, []);
      reading.year = date.getFullYear();
      reading.month = date.getMonth() + 1;
      reading.day = date.getDate();
      const consumption = Number(row[meter.importWizardName]);
      const volume = !getIsEnergyUnit(meter.startingUnit);
      reading.totalImportConsumption = consumption;
      reading.totalVolume = volume ? consumption : 0;
      reading.totalEnergyUse = volume && getIsEnergyMeter(meter.source) ? consumption * meter.heatCapacity : consumption;
      result.push(reading);
    }));
    return result;
  }

  private parsePredictors(draft: ImportFileDraft): { predictors: IdbPredictor[]; readings: IdbPredictorData[] } {
    const dateColumn = draft.columnGroups.find(group => group.groupLabel === 'Date')?.groupItems[0]?.value;
    if (!dateColumn) return { predictors: [], readings: [] };
    const predictors: IdbPredictor[] = [];
    const readings: IdbPredictorData[] = [];
    const existingPredictors = this.store.predictors();
    const existingReadings = this.store.predictorData();
    draft.predictorFacilityGroups.filter(group => !group.facilityName.startsWith('Unmapped')).forEach(group => group.groupItems.forEach(item => {
      const predictor = existingPredictors.find(value => value.facilityId === group.facilityId && value.name === item.value)
        ?? Object.assign(getNewIdbPredictor(this.store.account().guid, group.facilityId), { name: item.value });
      predictors.push({ ...predictor });
      draft.headerMap.forEach(row => {
        const date = new Date(row[dateColumn] as any);
        if (isNaN(date.valueOf())) return;
        const existingReading = existingReadings.find(value => value.predictorId === predictor.guid && checkSameMonthPredictorData(value, date));
        const reading = existingReading ? { ...existingReading } : getNewIdbPredictorData(predictor);
        reading.amount = Number(row[item.value]);
        readings.push(setPredictorDateDataFromDate({ ...reading }, date));
      });
    }));
    return { predictors, readings };
  }

  private mappingGroups(draft: ImportFileDraft, label: string, unmappedLabel: string): FacilityGroup[] {
    const items = draft.columnGroups.find(group => group.groupLabel === label)?.groupItems.map(value => ({ ...value })) ?? [];
    const selectedFacility = draft.selectedFacilityId;
    return [
      { facilityId: crypto.randomUUID(), facilityName: unmappedLabel, color: '', groupItems: selectedFacility ? [] : items },
      ...draft.importFacilities.map(facility => ({
        facilityId: facility.guid,
        facilityName: facility.name,
        color: facility.color,
        groupItems: selectedFacility === facility.guid ? items : []
      }))
    ];
  }

  private getFacilityGroups(facilities: IdbFacility[], records: IdbPredictor[], type: 'predictor'): FacilityGroup[] {
    return facilities.map(facility => ({
      facilityId: facility.guid,
      facilityName: facility.name,
      color: facility.color,
      groupItems: records.filter(record => record.facilityId === facility.guid).map((record, index) => ({
        index,
        value: record.name,
        id: record.guid,
        isExisting: record.id != null,
        isProductionPredictor: type === 'predictor' ? record.production : undefined
      }))
    })).filter(group => group.groupItems.length > 0);
  }

  private columnGroup(groupLabel: string, groupItems: ColumnItem[]): ColumnGroup {
    return { groupLabel, groupItems, id: crypto.randomUUID(), dragDropClass: groupLabel.replace(' ', '') };
  }

  private startsWith(actual: string[], expected: string[]): boolean {
    return expected.every((name, index) => actual[index] === name);
  }

  private kindForVersion(version: TemplateVersion): ImportFileKind {
    const kinds: Record<TemplateVersion, ImportFileKind> = {
      V1: 'verifi-v1', V2: 'verifi-v2', V3: 'verifi-v3', ETH: 'energy-treasure-hunt',
      'Non-template': 'general-workbook', 'Footprint-tool': 'footprint-tool'
    };
    return kinds[version];
  }

  private emptyParsed(): ParsedTemplate {
    return {
      importFacilities: [], importMeters: [], predictors: [], predictorData: [],
      meterData: [], newGroups: [], energyUseGroups: [], energyUseEquipment: []
    };
  }
}
