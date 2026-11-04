import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { registerDataDraft } from './register-data-draft';

@Component({ standalone: true, template: '' })
class DraftHost {
  readonly dirty = signal(false);
  readonly saving = signal(false);
  constructor() { registerDataDraft(this.dirty, () => this.dirty.set(false), this.saving); }
}

describe('Data draft registration', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('releases only the destroyed owner while preserving another draft and its unload protection', async () => {
    const first = TestBed.createComponent(DraftHost), second = TestBed.createComponent(DraftHost);
    const navigation = TestBed.inject(UnsavedChangesService);
    first.componentInstance.dirty.set(true); second.componentInstance.dirty.set(true); TestBed.tick();
    expect(navigation.hasUnsavedChanges()).toBe(true);
    await expect(navigation.flushPendingChanges()).resolves.toBe(true);
    expect(first.componentInstance.dirty()).toBe(true);

    first.destroy(); TestBed.tick();
    const remaining = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(remaining);
    expect(remaining.defaultPrevented).toBe(true); expect(navigation.hasUnsavedChanges()).toBe(true);
    second.destroy(); TestBed.tick();
    const closed = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(closed);
    expect(closed.defaultPrevented).toBe(false); expect(navigation.hasUnsavedChanges()).toBe(false);
  });
});
