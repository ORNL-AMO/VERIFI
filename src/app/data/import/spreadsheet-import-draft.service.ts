import { Injectable } from '@angular/core';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
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
import { likelyGeneralWorkbookDateColumn, parseGeneralWorkbookDate } from './general-workbook-column-profile';
import { UploadDataEnergyTreasureHuntService } from './parsers/upload-data-energy-treasure-hunt.service';
import { UploadDataFootprintToolService } from './parsers/upload-data-footprint-tool.service';
import { UploadDataV1Service } from './parsers/upload-data-v1.service';
import { UploadDataV2Service } from './parsers/upload-data-v2.service';
import { UploadDataV3Service } from './parsers/upload-data-v3.service';
import {
  ColumnGroup,
  ColumnItem,
  ColumnTarget,
  FacilityGroup,
  ImportFileDraft,
  ParsedTemplate,
  TemplateVersion
} from './spreadsheet-import.models';
import { checkSameMonthPredictorData } from './upload-helper-functions';
import { applyImportedWeatherReadingSemantics } from './predictor-import-review';
import { predictorReadingEntityKey } from './predictor-reading-import-review';
import { meterReadingEntityKey } from './meter-reading-import-review';
import { importKindForTemplateVersion } from './spreadsheet-import-format.registry';

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
    const kind = importKindForTemplateVersion(version);
    const parsed = version === 'Non-template' ? this.emptyParsed() : this.parseTemplate(workbook, version);
    const facilities = version === 'Non-template' || version === 'Footprint-tool'
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
      meters: parsed.importMeters.map(meter => ({
        ...meter,
        importWizardName: meter.importWizardName ?? meter.meterNumber
      })),
      meterData: parsed.meterData,
      predictors: this.normalizeImportedPredictors(parsed.predictors),
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
      excludedMeterReadingIds: [],
      skipExistingPredictorIds: [],
      invalidPredictorReadingsAcknowledged: false,
      excludedPredictorReadingIds: []
    };
    this.applyImportedWeatherSemantics(draft);
    if (version === 'Non-template') this.selectWorksheet(draft, selectedWorksheetName);
    if (version === 'Footprint-tool' && draft.selectedFacilityId) this.footprintParser.setSelectedFacility(draft);
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
      .filter(sheet => includeHidden || sheet.Hidden === 0)
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
    draft.headerMap = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet).map(row => {
      const normalized = Object.keys(row).reduce((result, key) => {
        result[key.trim()] = row[key];
        return result;
      }, {} as Record<string, unknown>);
      const sourceIndex = (row as Record<string, unknown> & { __rowNum__?: unknown }).__rowNum__;
      if (typeof sourceIndex === 'number') {
        Object.defineProperty(normalized, '__rowNum__', { value: sourceIndex, enumerable: false });
      }
      return normalized;
    });
    const items = headers.filter(Boolean).map((value, index) => ({ value, index, id: crypto.randomUUID() }));
    const date = likelyGeneralWorkbookDateColumn(items, draft.headerMap);
    draft.columnGroups = [
      this.columnGroup('Worksheet Columns', items.filter(item => item !== date)),
      this.columnGroup('Meters', []),
      this.columnGroup('Predictors', []),
      this.columnGroup('Date', date ? [date] : [])
    ];
    this.resetGeneralWorkbookDerivedState(draft);
    draft.findings = [];
  }

  assignColumn(draft: ImportFileDraft, itemId: string, target: ColumnTarget): void {
    this.assignColumns(draft, [itemId], target);
  }

  assignColumns(draft: ImportFileDraft, itemIds: readonly string[], target: ColumnTarget): void {
    const targetGroup = draft.columnGroups.find(group => group.groupLabel === target);
    const worksheetGroup = draft.columnGroups.find(group => group.groupLabel === 'Worksheet Columns');
    const uniqueIds = [...new Set(itemIds)];
    const items = draft.columnGroups
      .flatMap(group => group.groupItems)
      .filter(item => uniqueIds.includes(item.id))
      .sort((left, right) => left.index - right.index);
    if (!targetGroup || items.length === 0 || (target === 'Date' && (items.length !== 1 || !worksheetGroup))) return;

    const itemIdSet = new Set(items.map(item => item.id));
    draft.columnGroups.forEach(group => {
      group.groupItems = group.groupItems.filter(item => !itemIdSet.has(item.id));
    });
    if (target === 'Date' && targetGroup.groupItems.length) {
      const prior = targetGroup.groupItems.pop();
      if (prior && worksheetGroup) worksheetGroup.groupItems.push(prior);
    }
    targetGroup.groupItems.push(...items);
    draft.columnGroups.forEach(group => group.groupItems.sort((left, right) => left.index - right.index));
    this.resetGeneralWorkbookDerivedState(draft);
  }

  initializeFacilityMappings(draft: ImportFileDraft): void {
    draft.meterFacilityGroups = this.mappingGroups(draft, 'Meters', 'Unmapped Meters');
    draft.predictorFacilityGroups = this.mappingGroups(draft, 'Predictors', 'Unmapped Predictors');
    this.resetGeneralMeterMappingState(draft);
    this.resetGeneralPredictorMappingState(draft);
    this.materializeGeneralRecords(draft);
  }

  mapColumnToFacility(draft: ImportFileDraft, type: 'meter' | 'predictor', itemId: string, facilityId?: string): void {
    this.assignFacilityMappingItems(draft, type, [itemId], facilityId);
  }

  assignFacilityMappingItems(
    draft: ImportFileDraft,
    type: 'meter' | 'predictor',
    itemIds: readonly string[],
    facilityId?: string
  ): void {
    const groups = type === 'meter' ? draft.meterFacilityGroups : draft.predictorFacilityGroups;
    if (facilityId && !draft.importFacilities.some(facility => facility.guid === facilityId)) return;
    const target = groups.find(group => facilityId
      ? group.facilityId === facilityId
      : group.facilityName.startsWith('Unmapped'));
    if (!target) return;

    const requestedIds = new Set(itemIds);
    const movingItems = groups
      .filter(group => group !== target)
      .flatMap(group => group.groupItems)
      .filter(item => requestedIds.has(item.id))
      .sort((left, right) => left.index - right.index);
    if (!movingItems.length) return;

    const movingIds = new Set(movingItems.map(item => item.id));
    groups.forEach(group => {
      group.groupItems = group.groupItems.filter(item => !movingIds.has(item.id));
    });
    target.groupItems.push(...movingItems);
    groups.forEach(group => group.groupItems.sort((left, right) => left.index - right.index));

    if (type === 'meter') {
      this.resetGeneralMeterMappingState(draft);
      this.materializeGeneralMeters(draft);
    } else {
      this.resetGeneralPredictorMappingState(draft);
      this.materializeGeneralPredictors(draft);
    }
  }

  setGeneralWorkbookDefaultFacility(draft: ImportFileDraft, facilityId?: string): void {
    if (facilityId && !draft.importFacilities.some(facility => facility.guid === facilityId)) return;
    if (draft.selectedFacilityId === facilityId) return;
    draft.selectedFacilityId = facilityId;
    const mappingsInitialized = draft.meterFacilityGroups.length > 0 || draft.predictorFacilityGroups.length > 0;
    if (mappingsInitialized) this.initializeFacilityMappings(draft);
  }

  materializeGeneralRecords(draft: ImportFileDraft): void {
    this.materializeGeneralMeters(draft);
    this.materializeGeneralPredictors(draft);
  }

  materializeGeneralMeters(draft: ImportFileDraft): void {
    draft.meters = this.parseMeters(draft);
    draft.meterData = this.parseMeterReadings(draft);
  }

  materializeGeneralPredictors(draft: ImportFileDraft): void {
    const predictorResult = this.parsePredictors(draft);
    draft.predictors = this.normalizeImportedPredictors(predictorResult.predictors);
    draft.predictorData = predictorResult.readings;
    this.applyImportedWeatherSemantics(draft);
    const predictorIds = new Set(draft.predictors.map(predictor => predictor.guid));
    draft.skipExistingPredictorIds = draft.skipExistingPredictorIds.filter(id => predictorIds.has(id));
    draft.excludedPredictorReadingIds = [];
    draft.invalidPredictorReadingsAcknowledged = false;
  }

  replaceMeter(draft: ImportFileDraft, originalGuid: string, replacement: IdbUtilityMeter): void {
    const meterIndex = draft.meters.findIndex(meter => meter.guid === originalGuid);
    if (meterIndex < 0) return;

    const original = draft.meters[meterIndex];
    const updated = {
      ...replacement,
      importWizardName: original.importWizardName,
      skipImport: original.skipImport
    };
    draft.meters[meterIndex] = updated;
    draft.meterData.forEach(reading => {
      if (reading.meterId === originalGuid) reading.meterId = updated.guid;
    });
    draft.skipExistingReadingsMeterIds = draft.skipExistingReadingsMeterIds
      .map(guid => guid === originalGuid ? updated.guid : guid)
      .filter((guid, index, values) => values.indexOf(guid) === index);
    this.rebuildMeterReadings(draft);
  }

  replacePredictor(draft: ImportFileDraft, originalGuid: string, replacement: IdbPredictor): void {
    const predictorIndex = draft.predictors.findIndex(predictor => predictor.guid === originalGuid);
    if (predictorIndex < 0) return;

    const original = draft.predictors[predictorIndex];
    const updated: IdbPredictor = {
      ...structuredClone(replacement),
      importWizardName: original.importWizardName ?? original.name,
      skipImport: original.skipImport,
      productionInAnalysis: replacement.production
    };
    draft.predictors[predictorIndex] = updated;

    const excludedReadingIds = new Set(draft.excludedPredictorReadingIds.map(String));
    const updatedExclusions: Array<number | string> = [];
    const existingReadings = this.store.predictorData()
      .filter(reading => reading.predictorId === updated.guid);
    draft.predictorData = draft.predictorData.map((reading, index) => {
      if (reading.predictorId !== originalGuid) return reading;
      const wasExcluded = excludedReadingIds.has(predictorReadingEntityKey(reading, index))
        || excludedReadingIds.has(predictorReadingEntityKey(reading));
      const existing = existingReadings.find(candidate =>
        candidate.year === reading.year && candidate.month === reading.month);
      const remapped: IdbPredictorData = {
        ...reading,
        predictorId: updated.guid,
        facilityId: updated.facilityId,
        accountId: updated.accountId
      };
      if (existing) {
        remapped.id = existing.id;
        remapped.guid = existing.guid;
      } else {
        delete remapped.id;
      }
      const normalized = applyImportedWeatherReadingSemantics(remapped, updated);
      if (wasExcluded) updatedExclusions.push(predictorReadingEntityKey(normalized, index));
      return normalized;
    });
    const predictorIds = new Set(draft.predictors.map(predictor => predictor.guid));
    const keepExisting = draft.skipExistingPredictorIds.includes(originalGuid);
    draft.skipExistingPredictorIds = draft.skipExistingPredictorIds
      .filter(guid => guid !== originalGuid && predictorIds.has(guid));
    if (keepExisting && !draft.skipExistingPredictorIds.includes(updated.guid)) {
      draft.skipExistingPredictorIds.push(updated.guid);
    }
    const readingKeys = new Set(draft.predictorData.flatMap((reading, index) => [
      predictorReadingEntityKey(reading, index), predictorReadingEntityKey(reading)
    ]));
    draft.excludedPredictorReadingIds = [
      ...draft.excludedPredictorReadingIds.filter(key => readingKeys.has(String(key))),
      ...updatedExclusions
    ].filter((key, index, values) => values.findIndex(candidate => String(candidate) === String(key)) === index);
  }

  rebuildMeterReadings(draft: ImportFileDraft): void {
    const previousReadings = draft.meterData.map(reading => ({ ...reading }));
    let rebuilt: IdbUtilityMeterData[];
    if (draft.kind === 'general-workbook') {
      rebuilt = this.parseMeterReadings(draft);
    } else if (draft.kind === 'verifi-v1') {
      rebuilt = this.v1Parser.getMeterDataEntries(draft.workbook, this.templateParserMeters(draft.meters));
    } else if (draft.kind === 'verifi-v2') {
      rebuilt = this.v2Parser.getUtilityMeterData(draft.workbook, this.templateParserMeters(draft.meters));
    } else if (draft.kind === 'verifi-v3') {
      rebuilt = this.v3Parser.getUtilityMeterData(draft.workbook, this.templateParserMeters(draft.meters));
    } else {
      rebuilt = previousReadings.map(reading => {
        const meter = draft.meters.find(candidate => candidate.guid === reading.meterId);
        return meter ? {
          ...reading,
          heatCapacity: meter.heatCapacity ?? reading.heatCapacity,
          vehicleFuelEfficiency: meter.vehicleFuelEfficiency ?? reading.vehicleFuelEfficiency
        } : reading;
      });
    }

    const excluded = new Set(draft.excludedMeterReadingIds.map(String));
    const updatedExclusions: Array<number | string> = [];
    const matchedPreviousIndices = new Set<number>();
    draft.meterData = rebuilt.map((reading, index) => {
      const previousIndex = previousReadings.findIndex((candidate, candidateIndex) =>
        !matchedPreviousIndices.has(candidateIndex) && this.sameMeterReading(candidate, reading));
      const previous = previousReadings[previousIndex];
      if (previousIndex >= 0) matchedPreviousIndices.add(previousIndex);
      const reconciled = previous && reading.id == null
        ? { ...reading, id: previous.id, guid: previous.guid }
        : reading;
      if (previous && (excluded.has(meterReadingEntityKey(previous, previousIndex))
        || excluded.has(meterReadingEntityKey(previous)))) {
        updatedExclusions.push(meterReadingEntityKey(reconciled, index));
      }
      return reconciled;
    });
    draft.excludedMeterReadingIds = updatedExclusions;
  }

  applyFootprintFacility(draft: ImportFileDraft, facilityId: string): void {
    draft.selectedFacilityId = facilityId;
    this.footprintParser.setSelectedFacility(draft);
  }

  addGeneralFacility(draft: ImportFileDraft, name: string): IdbFacility {
    const facility = getNewIdbFacility(this.store.account());
    facility.name = name.trim();
    draft.importFacilities.push(facility);
    const mapping = { facilityId: facility.guid, facilityName: facility.name, color: facility.color, groupItems: [] };
    draft.meterFacilityGroups.push({ ...mapping, groupItems: [] });
    draft.predictorFacilityGroups.push({ ...mapping, groupItems: [] });
    return facility;
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
      const date = parseGeneralWorkbookDate(row[dateColumn]);
      if (!date) return;
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

  private sameMeterReading(left: IdbUtilityMeterData, right: IdbUtilityMeterData): boolean {
    return left.meterId === right.meterId && left.year === right.year &&
      left.month === right.month && left.day === right.day;
  }

  private templateParserMeters(meters: IdbUtilityMeter[]): IdbUtilityMeter[] {
    return meters.map(meter => ({
      ...meter,
      meterNumber: meter.importWizardName ?? meter.meterNumber
    }));
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
      const importedPredictor = { ...predictor, importWizardName: item.value };
      predictors.push(importedPredictor);
      draft.headerMap.forEach(row => {
        const date = parseGeneralWorkbookDate(row[dateColumn]);
        if (!date) return;
        const existingReading = existingReadings.find(value => value.predictorId === predictor.guid && checkSameMonthPredictorData(value, date));
        const reading = existingReading ? { ...existingReading } : getNewIdbPredictorData(predictor);
        reading.amount = Number(row[item.value]);
        readings.push(setPredictorDateDataFromDate({ ...reading }, date));
      });
    }));
    return { predictors, readings };
  }

  private normalizeImportedPredictors(predictors: readonly IdbPredictor[]): IdbPredictor[] {
    return predictors.map(predictor => ({
      ...predictor,
      importWizardName: predictor.importWizardName ?? predictor.name,
      predictorType: predictor.id == null ? 'Standard' : predictor.predictorType,
      productionInAnalysis: predictor.production
    }));
  }

  private applyImportedWeatherSemantics(draft: ImportFileDraft): void {
    const predictors = new Map(draft.predictors.map(predictor => [predictor.guid, predictor]));
    draft.predictorData = draft.predictorData.map(reading => {
      const predictor = predictors.get(reading.predictorId);
      return predictor ? applyImportedWeatherReadingSemantics(reading, predictor) : reading;
    });
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

  private columnGroup(groupLabel: ColumnTarget, groupItems: ColumnItem[]): ColumnGroup {
    return { groupLabel, groupItems, id: crypto.randomUUID(), dragDropClass: groupLabel.replace(' ', '') };
  }

  private resetGeneralWorkbookDerivedState(draft: ImportFileDraft): void {
    draft.meterFacilityGroups = [];
    draft.predictorFacilityGroups = [];
    draft.meters = [];
    draft.meterData = [];
    draft.predictors = [];
    draft.predictorData = [];
    draft.newMeterGroups = [];
    draft.skipExistingReadingsMeterIds = [];
    draft.skipExistingPredictorFacilityIds = [];
    draft.skipExistingPredictorIds = [];
    draft.excludedMeterReadingIds = [];
    draft.excludedPredictorReadingIds = [];
    draft.invalidMeterReadingsAcknowledged = false;
    draft.invalidPredictorReadingsAcknowledged = false;
  }

  private resetGeneralMeterMappingState(draft: ImportFileDraft): void {
    draft.meters = [];
    draft.meterData = [];
    draft.newMeterGroups = [];
    draft.skipExistingReadingsMeterIds = [];
    draft.excludedMeterReadingIds = [];
    draft.invalidMeterReadingsAcknowledged = false;
  }

  private resetGeneralPredictorMappingState(draft: ImportFileDraft): void {
    draft.predictors = [];
    draft.predictorData = [];
    draft.skipExistingPredictorFacilityIds = [];
    draft.skipExistingPredictorIds = [];
    draft.excludedPredictorReadingIds = [];
    draft.invalidPredictorReadingsAcknowledged = false;
  }

  private startsWith(actual: string[], expected: string[]): boolean {
    return expected.every((name, index) => actual[index] === name);
  }

  private emptyParsed(): ParsedTemplate {
    return {
      importFacilities: [], importMeters: [], predictors: [], predictorData: [],
      meterData: [], newGroups: [], energyUseGroups: [], energyUseEquipment: []
    };
  }
}
