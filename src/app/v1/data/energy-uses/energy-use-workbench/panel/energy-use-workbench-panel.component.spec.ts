import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseWorkbenchPanelComponent } from './energy-use-workbench-panel.component';

describe('energy use editor shells', () => {
  it('shows the active shell without editable controls or drafts and clears unavailable content', () => {
    const entry = signal<object | undefined>({ guid: 'energy-a' });
    const activeTab = signal('settings');
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [
      { provide: EnergyUseWorkbenchContextService, useValue: { entry, activeTab } }
    ] });
    const fixture = TestBed.createComponent(EnergyUseWorkbenchPanelComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Settings');
    activeTab.set('annual-data'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Annual Data');
    expect(fixture.nativeElement.querySelector('input,select,textarea')).toBeNull();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    entry.set(undefined); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });
});
