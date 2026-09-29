import { computed, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ImportWizardStateService } from '../import-wizard-state.service';

export function createImportWizardStateStub() {
  const draft = signal<any>({
    name: 'sample.xlsx',
    selectedWorksheetName: 'Visible',
    selectedWorksheetData: [['Date', 'Electricity'], ['2026-01-01', 12]],
    headerMap: [{ Date: '2026-01-01', Electricity: 12 }],
    importFacilities: [{ id: undefined, guid: 'facility-1', name: 'Main Plant' }],
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
    predictors: [{ id: 1, guid: 'predictor-1', name: 'Production', unit: 'units', production: true, skipImport: false }],
    predictorData: [{ guid: 'predictor-reading-1', predictorId: 'predictor-1' }],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    excludedMeterReadingIds: [],
    invalidMeterReadingsAcknowledged: false,
    selectedFacilityId: '',
    facilityEnergyUseGroups: [{ guid: 'use-group-1' }],
    facilityEnergyUseEquipment: [{
      id: undefined,
      guid: 'equipment-1',
      name: 'Boiler',
      utilityMeterGroupIds: [],
      utilityData: [{ energySource: 'Natural Gas' }]
    }]
  });
  const meterInvalid = vi.fn((_index: number) => false);
  const state: any = {
    draft,
    workspace: {
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
      meterData: signal([]),
      customFuels: signal([]),
      customGWPs: signal([])
    },
    newFacilityName: signal(''),
    worksheetNames: signal(['Visible']),
    allColumns: signal([{ id: 'column-1', value: 'Date' }]),
    dateRange: signal('1/1/2026 – 1/1/2026'),
    invalidReadingCount: signal(0),
    columnTarget: vi.fn(() => 'Date'),
    mappingItems: vi.fn(() => [{ id: 'column-2', value: 'Electricity', facilityId: '' }]),
    selectWorksheet: vi.fn(),
    assignColumn: vi.fn(),
    mapColumn: vi.fn(),
    addFacility: vi.fn(),
    meterInvalid,
    toggleMeterIncluded: vi.fn(),
    setMeterGroup: vi.fn(),
    autoGroupMeters: vi.fn(),
    setMeterCalendarization: vi.fn(),
    toggleAllMeterCalendarization: vi.fn(),
    availableExistingMeters: vi.fn(() => []),
    saveMeter: vi.fn(),
    notifyChanged: vi.fn(),
    readingInvalid: vi.fn(() => false),
    isReadingExcluded: vi.fn(() => false),
    toggleExcludedReading: vi.fn(),
    setSkipExistingMeterReadings: vi.fn(),
    togglePredictorIncluded: vi.fn(),
    setPredictorProduction: vi.fn(),
    setSkipExistingPredictorReadings: vi.fn(),
    setFootprintFacility: vi.fn(),
    compatibleMeterGroups: vi.fn(() => [{ guid: 'group-1', name: 'Natural Gas Meters' }]),
    meterGroupSourceConflict: vi.fn(() => false),
    toggleEquipmentMeterGroup: vi.fn()
  };
  state.meterRows = computed(() => draft().meters.map((meter: any, index: number) => ({
    index,
    meter,
    facilityName: draft().importFacilities.find((facility: any) => facility.guid === meter.facilityId)?.name ?? 'Unknown facility',
    valid: !meterInvalid(index),
    unitLabel: meter.scope === 2 ? meter.vehicleCollectionUnit : meter.startingUnit,
    groups: []
  })));
  return state;
}

export function renderImportStep<T>(
  component: Type<T>,
  state = createImportWizardStateStub(),
  routeData: Record<string, unknown> = {}
): { fixture: ComponentFixture<T>; state: ReturnType<typeof createImportWizardStateStub> } {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: ImportWizardStateService, useValue: state },
      { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } }
    ]
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return { fixture, state };
}
