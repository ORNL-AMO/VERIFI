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
    const workspaceService = { reloadActiveWorkspace: vi.fn().mockResolvedValue('published') };

    const service = new DbChangesService(
      {} as any, // accountDbService
      facilityDbService as any,
      {} as any, // accountAnalysisDbService
      {} as any, // analysisSelectionRepair
      loadingService as any,
      toastNotificationService as any,
      {} as any, // accountReportDbService
      cascadeDeleteService as any,
      workspaceService as any,
      { account: vi.fn(() => ({ guid: 'account-a' })) } as any
    );

    return {
      service,
      facilityDbService,
      loadingService,
      toastNotificationService,
      cascadeDeleteService,
      workspaceService
    };
  }

  it('persists a copy before publishing an active-account facility update', async () => {
    const { service, facilityDbService, workspaceService } = setup();

    await service.updateFacility(unselectedFacility);

    expect(facilityDbService.updateWithObservable).toHaveBeenCalledOnce();
    expect(facilityDbService.updateWithObservable.mock.calls[0][0]).toEqual(unselectedFacility);
    expect(facilityDbService.updateWithObservable.mock.calls[0][0]).not.toBe(unselectedFacility);
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
  });

  it('returns the persisted record after the committed publication', async () => {
    const { service, workspaceService } = setup();

    const updatedFacility = await service.updateFacility(selectedFacility);

    expect(updatedFacility.name).toBe('Selected Facility Updated');
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
  });

  it('does not publish or report success until facility deletion commits', async () => {
    const transaction = deferred<void>();
    const deleteFacility = vi.fn(() => transaction.promise);
    const { service, facilityDbService, loadingService, workspaceService } = setup(deleteFacility);
    const account = { guid: 'account-a' } as IdbAccount;

    const deletion = service.deleteFacility(selectedFacility, account);
    await Promise.resolve();

    expect(facilityDbService.accountFacilities.getValue()).toEqual([
      selectedFacility,
      unselectedFacility
    ]);
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
    expect(loadingService.isLoadingComplete.getValue()).toBe(false);

    transaction.resolve();
    await deletion;

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
    expect(loadingService.isLoadingComplete.getValue()).toBe(true);
  });

  it('leaves subjects unchanged, reports the error, and rethrows after transaction failure', async () => {
    const deleteFacility = vi.fn().mockRejectedValue(new Error('Injected transaction failure'));
    const {
      service,
      facilityDbService,
      loadingService,
      toastNotificationService,
      workspaceService
    } = setup(deleteFacility);
    const account = { guid: 'account-a' } as IdbAccount;

    await expect(service.deleteFacility(selectedFacility, account))
      .rejects.toThrow('Injected transaction failure');

    expect(facilityDbService.accountFacilities.getValue()).toEqual([
      selectedFacility,
      unselectedFacility
    ]);
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
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
