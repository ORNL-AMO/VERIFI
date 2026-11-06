import { signal } from '@angular/core';
import { InventoryHeaderActions, InventoryHeaderActionsRegistry } from './inventory-header-actions.service';

function actions(resource: 'meters' | 'predictors'): InventoryHeaderActions {
  const selecting = signal(false);
  return { resource, selecting: selecting.asReadonly(), canToggle: signal(true).asReadonly(),
    toggleSelection: () => selecting.update(value => !value) };
}

describe('inventory header registrations', () => {
  it('registers creation independently of selection and retains replacement owners', () => {
    const registry = new InventoryHeaderActionsRegistry();
    const first = { resource: 'energy-uses' as const, label: 'Add energy use', canCreate: signal(true), create: vi.fn() };
    const second = { ...first, create: vi.fn() };
    const unregister = registry.registerCreation(first);
    registry.registerCreation(second); unregister();
    expect(registry.creation()).toBe(second); expect(registry.current()).toBeUndefined();
  });
  it('keeps a replacement owner when the previous routed child unregisters', () => {
    const registry = new InventoryHeaderActionsRegistry();
    const meters = actions('meters'), predictors = actions('predictors');
    const removeMeters = registry.register(meters), removePredictors = registry.register(predictors);
    removeMeters();
    expect(registry.current()).toBe(predictors);
    registry.current()!.toggleSelection();
    expect(predictors.selecting()).toBe(true); expect(meters.selecting()).toBe(false);
    removePredictors();
    expect(registry.current()).toBeUndefined();
  });

  it('isolates separate Data headers and makes unregistering idempotent', () => {
    const first = new InventoryHeaderActionsRegistry(), second = new InventoryHeaderActionsRegistry();
    const firstActions = actions('meters'), secondActions = actions('predictors');
    const remove = first.register(firstActions); second.register(secondActions);
    remove(); remove();
    expect(first.current()).toBeUndefined(); expect(second.current()).toBe(secondActions);
  });
});
