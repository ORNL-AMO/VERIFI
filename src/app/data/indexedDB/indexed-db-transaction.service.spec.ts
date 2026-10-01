import { vi } from 'vitest';
import { IndexedDbTransactionContext } from './indexed-db-transaction.service';

describe('IndexedDbTransactionContext', () => {
  function setupCursorDeletion() {
    const cursorRequest = {} as IDBRequest<IDBCursorWithValue | null>;
    const deleteRequest = {} as IDBRequest<undefined>;
    const cursor = {
      delete: vi.fn(() => deleteRequest),
      continue: vi.fn()
    } as unknown as IDBCursorWithValue;
    const index = {
      openCursor: vi.fn(() => cursorRequest)
    };
    const objectStore = {
      index: vi.fn(() => index)
    };
    const transaction = {
      objectStore: vi.fn(() => objectStore)
    } as unknown as IDBTransaction;
    const context = new IndexedDbTransactionContext(
      transaction,
      new Set(['facilities'])
    );

    return { context, cursorRequest, deleteRequest, cursor };
  }

  it('rejects with an individual cursor delete request error', async () => {
    const { context, cursorRequest, deleteRequest, cursor } = setupCursorDeletion();
    const deletion = context.deleteAllByIndex('facilities', 'accountId', 'account-a');
    const failure = new DOMException('Injected delete failure', 'UnknownError');

    (cursorRequest as any).result = cursor;
    cursorRequest.onsuccess.call(cursorRequest, new Event('success'));
    (deleteRequest as any).error = failure;
    deleteRequest.onerror.call(deleteRequest, new Event('error'));

    await expect(deletion).rejects.toBe(failure);
    expect(cursor.continue).not.toHaveBeenCalled();
  });

  it('advances the cursor only after its delete request succeeds', async () => {
    const { context, cursorRequest, deleteRequest, cursor } = setupCursorDeletion();
    const deletion = context.deleteAllByIndex('facilities', 'accountId', 'account-a');

    (cursorRequest as any).result = cursor;
    cursorRequest.onsuccess.call(cursorRequest, new Event('success'));
    expect(cursor.continue).not.toHaveBeenCalled();

    deleteRequest.onsuccess.call(deleteRequest, new Event('success'));
    expect(cursor.continue).toHaveBeenCalledOnce();

    (cursorRequest as any).result = null;
    cursorRequest.onsuccess.call(cursorRequest, new Event('success'));
    await expect(deletion).resolves.toBeUndefined();
  });
});
