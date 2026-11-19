import { emptyMigrationData } from './data-migration.models';
import { DATA_MIGRATIONS } from './data-migration.registry';
import { getNewIdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';

describe('Home migration preservation', () => {
  it('retains initialized empty owners, future layouts and local/GUID identities through all historical steps', () => {
    const input = emptyMigrationData();
    input.homeOwners = [{ ...getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState()), id: 71 }];
    input.homeDashboards = [{ ...getNewIdbHomeDashboard('account-a', homeAccountOwner, homeDefinition()), id: 83,
      definition: { version: 999, retained: ['future', null] } }];
    const before = structuredClone(input);
    const output = DATA_MIGRATIONS.reduce((data, migration) => migration.migrate(data).data, input);
    expect(output.homeOwners).toEqual(before.homeOwners);
    expect(output.homeDashboards).toEqual(before.homeDashboards);
    expect(input).toEqual(before);
  });
});
