import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataWorkbenchResourceSwitcherComponent } from './data-workbench-resource-switcher.component';

describe('DataWorkbenchResourceSwitcherComponent', () => {
  it('owns menu keyboard navigation, selection, Escape, and focus restoration', async () => {
    TestBed.configureTestingModule({ imports: [DataWorkbenchResourceSwitcherComponent] });
    const fixture = TestBed.createComponent(DataWorkbenchResourceSwitcherComponent);
    fixture.componentRef.setInput('resources', [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' }
    ]);
    fixture.componentRef.setInput('selectedId', 'b');
    fixture.componentRef.setInput('currentLabel', 'Beta');
    fixture.componentRef.setInput('ariaLabel', 'Switch item');
    const selected = vi.fn();
    fixture.componentInstance.resourceSelected.subscribe(selected);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.v1-data-workbench-switcher-toggle') as HTMLButtonElement;
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.v1-data-workbench-switcher-item') as NodeListOf<HTMLButtonElement>;
    expect(document.activeElement).toBe(items[0]);

    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);

    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(toggle);

    toggle.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const reopenedItems = fixture.nativeElement.querySelectorAll('.v1-data-workbench-switcher-item') as NodeListOf<HTMLButtonElement>;
    reopenedItems[1].click();
    expect(selected).toHaveBeenCalledWith('b');
  });

  it('uses a non-interactive label when there is only one resource', () => {
    TestBed.configureTestingModule({ imports: [DataWorkbenchResourceSwitcherComponent] });
    const fixture = TestBed.createComponent(DataWorkbenchResourceSwitcherComponent);
    fixture.componentRef.setInput('resources', [{ id: 'a', label: 'Alpha' }]);
    fixture.componentRef.setInput('selectedId', 'a');
    fixture.componentRef.setInput('currentLabel', 'Alpha');
    fixture.componentRef.setInput('ariaLabel', 'Switch item');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Alpha');
  });
});
