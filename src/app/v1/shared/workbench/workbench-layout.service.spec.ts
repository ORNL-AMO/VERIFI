import { vi } from 'vitest';
import { WorkbenchLayoutService } from './workbench-layout.service';

describe('WorkbenchLayoutService', () => {
  it('defaults workbench facts to expanded when no session setting exists', () => {
    const service = new WorkbenchLayoutService(createStorage().storage as any);

    expect(service.factsExpanded()).toBe(true);
  });

  it('restores and updates the workbench facts preference for the current session', () => {
    const { storage, storedValue } = createStorage(true);
    const firstWorkbench = new WorkbenchLayoutService(storage as any);

    firstWorkbench.toggleFacts();

    expect(firstWorkbench.factsExpanded()).toBe(false);
    expect(storage.store).toHaveBeenCalledWith('v1WorkbenchFactsExpanded', false);
    expect(storedValue()).toBe(false);

    const nextWorkbench = new WorkbenchLayoutService(storage as any);
    expect(nextWorkbench.factsExpanded()).toBe(false);
  });

  it('ignores invalid stored values', () => {
    const service = new WorkbenchLayoutService(createStorage('collapsed').storage as any);

    expect(service.factsExpanded()).toBe(true);
  });
});

function createStorage(initialValue?: unknown) {
  let value = initialValue;
  return {
    storage: {
      retrieve: vi.fn(() => value),
      store: vi.fn((_key: string, nextValue: unknown) => {
        value = nextValue;
      })
    },
    storedValue: () => value
  };
}
