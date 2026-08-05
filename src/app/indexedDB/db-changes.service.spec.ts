import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbAccount } from '../models/idbModels/account';
import { DbChangesService } from './db-changes.service';

describe('DbChangesService facility updates', () => {
  const selectedFacility = {
    id: 101,
    guid: 'facility-a',
    accountId: 'account-a',
    name: 'Selected Facility'
  } as IdbFacility;
  const unselectedFacility = {
    id: 102,
    guid: 'facility-b',
    accountId: 'account-a',
    name: 'Unselected Facility'
  } as IdbFacility;

  function deferred<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve: resolve!, reject: reject! };
  }

  function setup(deleteFacility = vi.fn().mockResolvedValue(undefined)) {
    const facilityDbService = {
      selectedFacility: new BehaviorSubject<IdbFacility>(selectedFacility),
      accountFacilities: new BehaviorSubject<Array<IdbFacility>>([
        selectedFacility,
        unselectedFacility
      ]),
      updateWithObservable: vi.fn((facility: IdbFacility) => of({
        ...facility,
        name: `${facility.name} Updated`
      })),
      getAllAccountFacilities: vi.fn(async () => [
        selectedFacility,
        unselectedFacility
      ])
    };
    const loadingService = {
      setContext: vi.fn(),
      setTitle: vi.fn(),
      setCurrentLoadingIndex: vi.fn(),
      addLoadingMessage: vi.fn(),
      isLoadingComplete: new BehaviorSubject<boolean>(false)
    };
    const toastNotificationService = { showToast: vi.fn() };
    const cascadeDeleteService = { deleteFacility };

    const service = new DbChangesService(
      {} as any, // accountDbService
      facilityDbService as any,
      {} as any, // accountAnalysisDbService
      {} as any, // analysisDbService
      {} as any, // predictorsDbServiceDeprecated
      {} as any, // utilityMeterDbService
      {} as any, // utilityMeterDataDbService
      {} as any, // utilityMeterGroupDbService
      {} as any, // updateDbEntryService
      {} as any, // customEmissionsDbService
      loadingService as any,
      toastNotificationService as any,
      {} as any, // accountReportDbService
      {} as any, // customFuelDbService
      {} as any, // customGWPDbService
      {} as any, // predictorDbService
      {} as any, // predictorDataDbService
      {} as any, // migratePredictorsService
      {} as any, // facilityReportsDbService
      {} as any, // facilityEnergyUseGroupsDbService
      {} as any, // facilityEnergyUseEquipmentDbService
      cascadeDeleteService as any
    );

    return {
      service,
      facilityDbService,
      loadingService,
      toastNotificationService,
      cascadeDeleteService
    };
  }

  it('does not select an unselected facility when it is updated', async () => {
    const { service, facilityDbService } = setup();

    await service.updateFacility(unselectedFacility);

    expect(facilityDbService.selectedFacility.getValue()).toBe(selectedFacility);
  });

  it('publishes the updated record when the selected facility is updated', async () => {
    const { service, facilityDbService } = setup();

    const updatedFacility = await service.updateFacility(selectedFacility);

    expect(updatedFacility.name).toBe('Selected Facility Updated');
    expect(facilityDbService.selectedFacility.getValue()).toEqual(updatedFacility);
  });

  it('does not refresh subjects or report success until facility deletion commits', async () => {
    const transaction = deferred<void>();
    const deleteFacility = vi.fn(() => transaction.promise);
    const { service, facilityDbService, loadingService } = setup(deleteFacility);
    const account = { guid: 'account-a' } as IdbAccount;
    const selectAccount = vi.spyOn(service, 'selectAccount').mockResolvedValue(undefined);

    const deletion = service.deleteFacility(selectedFacility, account);
    await Promise.resolve();

    expect(facilityDbService.accountFacilities.getValue()).toEqual([
      selectedFacility,
      unselectedFacility
    ]);
    expect(selectAccount).not.toHaveBeenCalled();
    expect(loadingService.isLoadingComplete.getValue()).toBe(false);

    transaction.resolve();
    await deletion;

    expect(selectAccount).toHaveBeenCalledWith(account, false);
    expect(loadingService.isLoadingComplete.getValue()).toBe(true);
  });

  it('leaves subjects unchanged, reports the error, and rethrows after transaction failure', async () => {
    const deleteFacility = vi.fn().mockRejectedValue(new Error('Injected transaction failure'));
    const {
      service,
      facilityDbService,
      loadingService,
      toastNotificationService
    } = setup(deleteFacility);
    const account = { guid: 'account-a' } as IdbAccount;
    const selectAccount = vi.spyOn(service, 'selectAccount').mockResolvedValue(undefined);

    await expect(service.deleteFacility(selectedFacility, account))
      .rejects.toThrow('Injected transaction failure');

    expect(facilityDbService.accountFacilities.getValue()).toEqual([
      selectedFacility,
      unselectedFacility
    ]);
    expect(selectAccount).not.toHaveBeenCalled();
    expect(loadingService.isLoadingComplete.getValue()).toBe(false);
    expect(toastNotificationService.showToast).toHaveBeenCalledWith(
      'Facility Deletion Failed',
      expect.any(String),
      15000,
      false,
      'alert-danger'
    );
  });
});
