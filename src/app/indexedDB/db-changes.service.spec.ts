import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { IdbFacility } from '../models/idbModels/facility';
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

  function setup() {
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

    const service = new DbChangesService(
      {} as any,
      facilityDbService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    return { service, facilityDbService };
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
});
