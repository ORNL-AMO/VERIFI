import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { ACCOUNT_REPORT_TYPES, FACILITY_REPORT_TYPES, reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import { ReportWorkbenchEditor } from '../../editing/report-autosave-controller';
import { ReportsSharedModule } from '../../reports-shared.module';
import { ReportWorkbenchHeaderComponent } from './report-workbench-header.component';

const kinds = [
  ...ACCOUNT_REPORT_TYPES.map(item => ({ scope: 'account' as const, type: item.value })),
  ...FACILITY_REPORT_TYPES.map(item => ({ scope: 'facility' as const, type: item.value }))
];

async function setup(kind = kinds[0]) {
  TestBed.configureTestingModule({ imports: [ReportsSharedModule], providers: [provideRouter([]),
    { provide: WorkbenchLayoutService, useValue: { factsExpanded: signal(false), toggleFacts: vi.fn() } }] });
  const fixture = TestBed.createComponent(ReportWorkbenchHeaderComponent);
  const editor: ReportWorkbenchEditor = { state: signal('idle'), error: signal(undefined), saving: signal(false), isDirty: signal(false),
    retry: vi.fn(), discard: vi.fn(), pauseAutosave: vi.fn(), resumeAutosave: vi.fn() };
  const definition = reportDefinition(kind.scope, kind.type)!;
  const name = `${definition.label} report for manufacturing operations and long facility names`;
  const resources = [{ id: 'current', label: name, icon: definition.icon }, { id: 'other', label: 'Another report', icon: definition.icon }];
  for (const [key, value] of Object.entries({ editor, breadcrumbs: [{ label: 'Reports' }], resources,
    selectedId: 'current', name, typeLabel: definition.label, status: 'ready', statusLabel: 'Setup ready', facts: [], stages: [] })) {
    fixture.componentRef.setInput(key, value);
  }
  const root = fixture.nativeElement as HTMLElement;
  root.className = 'v1-root v1-palette-blueprint';
  Object.assign(root.style, { display: 'block', width: '100%', boxSizing: 'border-box', padding: '16px' });
  fixture.detectChanges(); await fixture.whenStable();
  return { fixture, root, resources };
}

describe('report heading alignment in Chromium', () => {
  afterEach(async () => { TestBed.resetTestingModule(); await page.viewport(1280, 720); });
  it.each(kinds)('aligns the icon and name for $scope $type with one report or a report switcher', async kind => {
    const { fixture, root, resources } = await setup(kind);
    for (const [width, theme] of [[1280, 'light'], [760, 'dark'], [390, 'high-contrast']] as const) {
      await page.viewport(width, 900);
      root.classList.toggle('v1-theme-dark', theme !== 'light'); root.classList.toggle('v1-contrast-strong', theme === 'high-contrast');
      for (const available of [resources.slice(0, 1), resources]) {
        fixture.componentRef.setInput('resources', available); fixture.detectChanges(); await fixture.whenStable();
        const heading = root.querySelector<HTMLElement>('h1')!;
        const icon = heading.querySelector<HTMLElement>(':scope > app-ui-icon')!.getBoundingClientRect();
        const title = heading.querySelector<HTMLElement>('.v1-data-workbench-switcher')!.getBoundingClientRect();
        expect(Math.abs((icon.top + icon.bottom) / 2 - (title.top + title.bottom) / 2)).toBeLessThan(1);
        expect(title.left).toBeGreaterThan(icon.right);
        expect(title.right).toBeLessThanOrEqual(heading.getBoundingClientRect().right + 1);
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      }
    }
  });
  it('keeps the report switcher keyboard accessible beside the aligned icon', async () => {
    await page.viewport(390, 900);
    const { fixture, root } = await setup(), selected = vi.fn();
    fixture.componentInstance.reportSelected.subscribe(selected);
    const toggle = root.querySelector<HTMLButtonElement>('.v1-data-workbench-switcher-toggle')!;
    toggle.focus(); await userEvent.keyboard('{Enter}'); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('[role="menu"]')).not.toBeNull();
    await userEvent.keyboard('{ArrowDown}{Enter}'); fixture.detectChanges(); await fixture.whenStable();
    expect(selected).toHaveBeenCalledWith('other'); expect(root.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});
