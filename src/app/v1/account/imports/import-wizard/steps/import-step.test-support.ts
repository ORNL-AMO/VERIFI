import { computed, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { buildImportMeterReadingReview } from '@data/import/meter-reading-import-review';
import { getImportPredictorIssues, isImportPredictorValid } from '@data/import/predictor-import-review';
import { buildImportPredictorReadingReview } from '@data/import/predictor-reading-import-review';
import { ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { ImportMeterReviewStateService } from '../import-meter-review-state.service';
import { ImportPredictorReviewStateService } from '../import-predictor-review-state.service';
import { buildImportReviewSummary } from '../import-review-summary';
import { ImportWizardStateService } from '../import-wizard-state.service';

export function createImportWizardStateStub() {
  const draft = signal<ImportFileDraft>({
    name: 'sample.xlsx',
    kind: 'verifi-v3',
    selectedWorksheetName: 'Visible',
    selectedWorksheetData: [['Date', 'Electricity'], ['2026-01-01', 12]],
    headerMap: [{ Date: '2026-01-01', Electricity: 12 }],
    importFacilities: [{ id: undefined, guid: 'facility-1', name: 'Main Plant', color: '#1f77b4' }],
    meters: [{
      id: undefined,
      guid: 'meter-1',
      accountId: 'account-1',
      facilityId: 'facility-1',
      name: 'Electricity',
      importWizardName: 'Electricity',
      source: 'Electricity',
      startingUnit: 'kWh',
      energyUnit: 'MMBtu',
      meterReadingDataApplication: 'backward',
      skipImport: false
    }],
    meterData: [{ guid: 'reading-1', meterId: 'meter-1', year: 2026, month: 1, day: 1, totalEnergyUse: 12 }],
    predictors: [{
      id: 1,
      guid: 'predictor-1',
      accountId: 'account-1',
      facilityId: 'facility-1',
      name: 'Production',
      importWizardName: 'Production',
      unit: 'units',
      description: '',
      production: true,
      productionInAnalysis: true,
      predictorType: 'Standard',
      weatherDataType: 'HDD',
      skipImport: false
    }],
    predictorData: [{
      guid: 'predictor-reading-1', predictorId: 'predictor-1', accountId: 'account-1', facilityId: 'facility-1',
      year: 2026, month: 1, amount: 12, weatherOverride: false, weatherDataWarning: false
    }],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    skipExistingPredictorIds: [],
    excludedMeterReadingIds: [],
    invalidMeterReadingsAcknowledged: false,
    excludedPredictorReadingIds: [],
    invalidPredictorReadingsAcknowledged: false,
    selectedFacilityId: '',
    facilityEnergyUseGroups: [{
      id: undefined,
      guid: 'use-group-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      name: 'Process heating'
    }],
    facilityEnergyUseEquipment: [{
      id: undefined,
      guid: 'equipment-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      energyUseGroupId: 'use-group-1',
      name: 'Boiler',
      utilityMeterGroupIds: [],
      utilityData: [{ energySource: 'Natural Gas' }]
    }]
  } as ImportFileDraft);
  const workspaceMeterData = signal<IdbUtilityMeterData[]>([]);
  const workspacePredictorData = signal<IdbPredictorData[]>([]);
  const workspace = {
    account: signal({ guid: 'account-1', assessmentReportVersion: 'AR6' }),
    facilities: signal([{
      guid: 'facility-1',
      accountId: 'account-1',
      name: 'Main Plant',
      energyUnit: 'MMBtu',
      electricityUnit: 'kWh',
      volumeGasUnit: 'CCF',
      volumeLiquidUnit: 'gal',
      massUnit: 'lb'
    }]),
    meters: signal([]),
    meterGroups: signal([]),
    meterData: workspaceMeterData,
    predictors: signal([]),
    predictorData: workspacePredictorData,
    customFuels: signal([]),
    customGWPs: signal([])
  };

  const meterInvalid = vi.fn((_index: number) => false);
  const meterRows = computed(() => draft().meters.map((meter, index) => ({
    index,
    meter,
    facilityName: draft().importFacilities.find(facility => facility.guid === meter.facilityId)?.name ?? 'Unknown facility',
    valid: !meterInvalid(index),
    unitLabel: meter.scope === 2 ? meter.vehicleCollectionUnit : meter.startingUnit,
    groups: []
  })));
  const meterReadingRows = computed(() => buildImportMeterReadingReview({
    meters: draft().meters,
    readings: draft().meterData,
    facilities: draft().importFacilities,
    currentReadings: workspaceMeterData(),
    excludedReadingIds: draft().excludedMeterReadingIds,
    skipExistingMeterIds: draft().skipExistingReadingsMeterIds
  }).map(row => ({ ...row, primaryUnitLabel: row.primaryUnit })));
  const importedMeterReadingCount = computed(() => meterReadingRows().reduce((total, row) =>
    total + row.newReadings.count + row.invalidReadings.count + row.existingReadings.count, 0));
  const invalidMeterReadingCount = computed(() => meterReadingRows().reduce((total, row) =>
    total + row.invalidReadings.count, 0));
  const hasExistingMeterReadings = computed(() => meterReadingRows().some(row => row.existingReadings.count > 0));
  const allExistingMeterReadingsKept = computed(() => {
    const eligible = meterReadingRows().filter(row => row.existingReadings.count > 0);
    return eligible.length > 0 && eligible.every(row => row.keepExisting);
  });
  const someExistingMeterReadingsKept = computed(() => meterReadingRows()
    .some(row => row.existingReadings.count > 0 && row.keepExisting));
  const meterState = {
    draft,
    workspace,
    rows: meterRows,
    readingRows: meterReadingRows,
    importedReadingCount: importedMeterReadingCount,
    invalidReadingCount: invalidMeterReadingCount,
    hasExistingReadings: hasExistingMeterReadings,
    allExistingReadingsKept: allExistingMeterReadingsKept,
    someExistingReadingsKept: someExistingMeterReadingsKept,
    invalid: meterInvalid,
    toggleIncluded: vi.fn(),
    setGroup: vi.fn(),
    autoGroup: vi.fn(),
    setCalendarization: vi.fn(),
    toggleAllCalendarization: vi.fn(),
    availableExisting: vi.fn(() => []),
    save: vi.fn(),
    toggleExcludedReading: vi.fn(),
    setSkipExistingReadings: vi.fn(),
    setAllSkipExistingReadings: vi.fn(),
    setInvalidReadingsAcknowledged: vi.fn()
  };

  const predictorRows = computed(() => draft().predictors.map((predictor, index) => ({
    index,
    predictor,
    facilityName: draft().importFacilities.find(facility => facility.guid === predictor.facilityId)?.name ?? 'Unknown facility',
    valid: isImportPredictorValid(predictor),
    issues: getImportPredictorIssues(predictor),
    typeLabel: predictor.predictorType === 'Weather' ? 'Weather' : 'Standard',
    typeDetail: predictor.predictorType === 'Weather'
      ? `${predictor.weatherStationName || predictor.weatherStationId} · ${predictor.weatherDataType}`
      : undefined
  })));
  const allPredictorsIncluded = computed(() => predictorRows().length > 0
    && predictorRows().every(row => !row.predictor.skipImport));
  const somePredictorsIncluded = computed(() => predictorRows().some(row => !row.predictor.skipImport));
  const predictorReadingRows = computed(() => buildImportPredictorReadingReview({
    predictors: draft().predictors,
    readings: draft().predictorData,
    facilities: draft().importFacilities,
    currentReadings: workspacePredictorData(),
    excludedReadingIds: draft().excludedPredictorReadingIds,
    skipExistingPredictorIds: draft().skipExistingPredictorIds
  }));
  const importedPredictorReadingCount = computed(() => predictorReadingRows().reduce((total, row) =>
    total + row.newReadings.count + row.invalidReadings.count + row.existingReadings.count, 0));
  const invalidPredictorReadingCount = computed(() => predictorReadingRows().reduce((total, row) =>
    total + row.invalidReadings.count, 0));
  const predictorReadingsToImportCount = computed(() => predictorReadingRows().reduce((total, row) =>
    total + row.newReadings.count + (row.keepExisting ? 0 : row.existingReadings.count)
      + row.invalidReadingDetails.filter(reading => !reading.excluded).length, 0));
  const hasExistingPredictorReadings = computed(() => predictorReadingRows()
    .some(row => row.existingReadings.count > 0));
  const allExistingPredictorReadingsKept = computed(() => {
    const eligible = predictorReadingRows().filter(row => row.existingReadings.count > 0);
    return eligible.length > 0 && eligible.every(row => row.keepExisting);
  });
  const someExistingPredictorReadingsKept = computed(() => predictorReadingRows()
    .some(row => row.existingReadings.count > 0 && row.keepExisting));
  const predictorState = {
    draft,
    workspace,
    rows: predictorRows,
    allIncluded: allPredictorsIncluded,
    someIncluded: somePredictorsIncluded,
    readingRows: predictorReadingRows,
    importedReadingCount: importedPredictorReadingCount,
    invalidReadingCount: invalidPredictorReadingCount,
    readingsToImportCount: predictorReadingsToImportCount,
    hasExistingReadings: hasExistingPredictorReadings,
    allExistingReadingsKept: allExistingPredictorReadingsKept,
    someExistingReadingsKept: someExistingPredictorReadingsKept,
    toggleIncluded: vi.fn(),
    setAllIncluded: vi.fn(),
    setProduction: vi.fn(),
    availableExisting: vi.fn(() => []),
    save: vi.fn(),
    setSkipExistingReadings: vi.fn(),
    setAllSkipExistingReadings: vi.fn(),
    toggleExcludedReading: vi.fn(),
    setInvalidReadingsAcknowledged: vi.fn()
  };

  const reviewSummary = computed(() => buildImportReviewSummary({
    kind: draft().kind,
    selectedFacilityId: draft().selectedFacilityId,
    facilities: draft().importFacilities,
    meterRows: meterRows(),
    meterReadingRows: meterReadingRows(),
    predictorRows: predictorRows(),
    predictorReadingRows: predictorReadingRows(),
    energyUseGroups: draft().facilityEnergyUseGroups,
    equipment: draft().facilityEnergyUseEquipment
  }));
  const wizardState = {
    draft,
    workspace,
    newFacilityName: signal(''),
    worksheetNames: signal(['Visible']),
    allColumns: signal([{ id: 'column-1', value: 'Date' }]),
    dateRange: signal('1/1/2026 – 1/1/2026'),
    reviewSummary,
    columnTarget: vi.fn(() => 'Date'),
    mappingItems: vi.fn(() => [{ id: 'column-2', value: 'Electricity', facilityId: '' }]),
    selectWorksheet: vi.fn(),
    assignColumn: vi.fn(),
    mapColumn: vi.fn(),
    addFacility: vi.fn(),
    setFootprintFacility: vi.fn(),
    compatibleMeterGroups: vi.fn(() => [{ guid: 'group-1', name: 'Natural Gas Meters' }]),
    meterGroupSourceConflict: vi.fn(() => false),
    toggleEquipmentMeterGroup: vi.fn()
  };

  return { ...wizardState, wizardState, meterState, predictorState };
}

export function renderImportStep<T>(
  component: Type<T>,
  state = createImportWizardStateStub(),
  routeData: Record<string, unknown> = {}
): { fixture: ComponentFixture<T>; state: ReturnType<typeof createImportWizardStateStub> } {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: ImportWizardStateService, useValue: state.wizardState },
      { provide: ImportMeterReviewStateService, useValue: state.meterState },
      { provide: ImportPredictorReviewStateService, useValue: state.predictorState },
      { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } }
    ]
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return { fixture, state };
}
