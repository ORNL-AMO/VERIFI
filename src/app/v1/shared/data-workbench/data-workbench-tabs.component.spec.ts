import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataWorkbenchTabsComponent } from './data-workbench-tabs.component';

describe('DataWorkbenchTabsComponent', () => {
  it('renders connected tabs, active state, attention, and emits the selected identifier', () => {
    TestBed.configureTestingModule({ imports: [DataWorkbenchTabsComponent] });
    const fixture = TestBed.createComponent(DataWorkbenchTabsComponent);
    fixture.componentRef.setInput('tabs', [
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'readings', label: 'Readings', icon: 'table' }
    ]);
    fixture.componentRef.setInput('activeTab', 'readings');
    fixture.componentRef.setInput('ariaLabel', 'Data sections');
    fixture.componentRef.setInput('attention', {
      readings: { total: 2, errorCount: 1, warningCount: 1, state: 'error' }
    });
    const selected = vi.fn();
    fixture.componentInstance.tabSelected.subscribe(selected);
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(navigation.classList).toContain('v1-data-tabs--connected');
    expect(navigation.getAttribute('aria-label')).toBe('Data sections');
    expect(buttons[1].getAttribute('aria-current')).toBe('page');
    expect(buttons[1].textContent).toContain('2');

    buttons[0].click();
    expect(selected).toHaveBeenCalledWith('settings');
  });
});
