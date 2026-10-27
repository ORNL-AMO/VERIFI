import { CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { UtilityMeterDataService } from '@v0/shared/shared-meter-content/utility-meter-data.service';
import { FacilitydbService } from '@data/indexedDB/facility-db.service';
import { UtilityMeterdbService } from '@data/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '@data/indexedDB/utilityMeterData-db.service';
import { PredictorDbService } from '@data/indexedDB/predictor-db.service';
import { PredictorDataDbService } from '@data/indexedDB/predictor-data-db.service';
import { UtilityMeterGroupdbService } from '@data/indexedDB/utilityMeterGroup-db.service';
import { FacilityEnergyUseGroupsDbService } from '@data/indexedDB/facility-energy-use-groups-db.service';
import { FacilityEnergyUseEquipmentDbService } from '@data/indexedDB/facility-energy-use-equipment-db.service';
import { EnergyUnitsHelperService } from '@shared/helper-services/energy-units-helper.service';
import { EditMeterFormService } from '@v0/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { UploadDataV1Service } from './upload-data-v1.service';
import { UploadDataV2Service } from './upload-data-v2.service';
import { UploadDataV3Service } from './upload-data-v3.service';
import { UploadDataEnergyTreasureHuntService } from './upload-data-energy-treasure-hunt.service';
import { UploadDataFootprintToolService } from './upload-data-footprint-tool.service';
import { UploadDataService } from './upload-data.service';
import { getEmptyFileReference } from './upload-data-models';
import { ProcessMeterReadingsComponent } from '../shared-process-file/process-meter-readings/process-meter-readings.component';

@NgModule({ declarations: [ProcessMeterReadingsComponent], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class ImportPreviewTestModule { }

describe('meter import consumption validation', () => {
  let upload: UploadDataService;
  let forms: UtilityMeterDataService;
  let add: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    add = vi.fn(reading => of(reading));
    update = vi.fn(reading => of(reading));
    const unusedServices = [
      AccountWorkspaceQueryService, FacilitydbService, PredictorDbService, PredictorDataDbService,
      UtilityMeterGroupdbService, FacilityEnergyUseGroupsDbService, FacilityEnergyUseEquipmentDbService,
      EnergyUnitsHelperService, EditMeterFormService, ToastNotificationsService,
      UploadDataV1Service, UploadDataV2Service, UploadDataV3Service,
      UploadDataEnergyTreasureHuntService, UploadDataFootprintToolService
    ];
    TestBed.configureTestingModule({
      imports: [ImportPreviewTestModule],
      providers: [
        UploadDataService, UtilityMeterDataService,
        ...unusedServices.map(provide => ({ provide, useValue: {} })),
        { provide: AccountWorkspaceStore, useValue: { account: signal(null), selectedFacility: signal(null) } },
        { provide: AccountWorkspaceService, useValue: { reloadActiveWorkspace: vi.fn(async () => {}) } },
        { provide: UtilityMeterdbService, useValue: { addWithObservable: (meter: IdbUtilityMeter) => of(meter) } },
        { provide: UtilityMeterDatadbService, useValue: { addWithObservable: add, updateWithObservable: update } },
        { provide: SharedDataService, useValue: { modalOpen: new Subject() } },
        { provide: LoadingService, useValue: {
          setContext: vi.fn(), setTitle: vi.fn(), addLoadingMessage: vi.fn(), setCurrentLoadingIndex: vi.fn(),
          isLoadingComplete: new Subject()
        } }
      ]
    });
    upload = TestBed.inject(UploadDataService);
    forms = TestBed.inject(UtilityMeterDataService);
  });

  for (const source of ['Natural Gas', 'Other Fuels', 'Other Energy'] as const) {
    it.each([true, false, undefined])(`agrees on preview and submission for negative ${source} consumption with setting %s`, async canBeNegative => {
      const meter = {
        guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Negative meter',
        source, startingUnit: source === 'Other Energy' ? 'klb' : 'SCF',
        energyUnit: 'MMBtu', heatCapacity: 2, scope: 1, canBeNegative
      } as IdbUtilityMeter;
      const reading = {
        ...getNewIdbUtilityMeterData(meter, []), day: 15, month: 1, year: 2025,
        totalVolume: -10, totalEnergyUse: -20
      };
      const file = getEmptyFileReference();
      file.meters = [meter];
      file.meterData = [reading, { ...reading, guid: 'existing-reading', id: 2, month: 2 }];
      const preview = new ProcessMeterReadingsComponent(undefined, undefined, forms);
      preview.fileReference = file;
      preview.setSummary();
      expect(preview.meterDataSummaries[0].invalidEntries).toBe(canBeNegative ? 0 : 2);
      expect(preview.meterDataSummaries[0].newEntries).toBe(canBeNegative ? 1 : 0);
      expect(preview.meterDataSummaries[0].existingEntries).toBe(canBeNegative ? 1 : 0);

      await upload.submit(file);
      expect(add).toHaveBeenCalledTimes(canBeNegative ? 1 : 0);
      expect(update).toHaveBeenCalledTimes(canBeNegative ? 1 : 0);
      if (canBeNegative) {
        expect(add).toHaveBeenCalledWith(expect.objectContaining({ totalVolume: -10, totalEnergyUse: -20 }));
      }
    });
  }
});
