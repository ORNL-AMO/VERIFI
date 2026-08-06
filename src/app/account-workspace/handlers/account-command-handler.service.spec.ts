import { vi } from 'vitest';
import { AccountCommandHandler } from './account-command-handler.service';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { IdbAccount } from '../../models/idbModels/account';

describe('AccountCommandHandler', () => {
  function createHandler() {
    const accountDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn()
    };
    const handler = new AccountCommandHandler(accountDb as any);
    return { handler, accountDb };
  }

  it('add persists and returns the new account', async () => {
    const { handler, accountDb } = createHandler();
    const account = { guid: 'acct-1' } as IdbAccount;
    const persisted = { ...account, id: 1 };
    accountDb.addWithObservable.mockReturnValue({ subscribe: (o: any) => o.next(persisted) || { unsubscribe: () => {} } });
    // Use a proper Observable mock
    const { of } = await import('rxjs');
    accountDb.addWithObservable.mockReturnValue(of(persisted));

    const result = await handler.add(account);

    expect(result).toEqual(persisted);
    expect(accountDb.addWithObservable).toHaveBeenCalledWith(expect.objectContaining({ guid: 'acct-1' }));
  });

  it('update persists and returns the updated account', async () => {
    const { handler, accountDb } = createHandler();
    const { of } = await import('rxjs');
    const account = { guid: 'acct-1' } as IdbAccount;
    const persisted = { ...account, name: 'Updated' };
    accountDb.updateWithObservable.mockReturnValue(of(persisted));

    const result = await handler.update(account, 'acct-1');

    expect(result).toEqual(persisted);
  });

  it('update rejects cross-account entity before any repository call', async () => {
    const { handler, accountDb } = createHandler();
    const account = { guid: 'acct-other' } as IdbAccount;

    await expect(handler.update(account, 'acct-active')).rejects.toMatchObject({
      code: 'cross-account-entity'
    });

    expect(accountDb.updateWithObservable).not.toHaveBeenCalled();
  });
});
