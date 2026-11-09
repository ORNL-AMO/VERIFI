import { NgComponentOutlet } from '@angular/common';
import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, inject, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { SetupCalculatorComponent } from '../../../forms/setup-calculator/setup-calculator.component';
import { EquipmentTableComponent } from '../equipment-table/equipment-table.component';
import { AddYearDrawerComponent } from './add-year-drawer.component';
import { AddYearController } from './add-year.controller';
import { setupYearController } from './add-year-drawer.testing';

@Component({ standalone: true, imports: [PortalModule, NgComponentOutlet], template: `
  <ng-template #drawer><ng-container [ngComponentOutlet]="type" [ngComponentOutletInputs]="inputs()"/></ng-template>
  <ng-template [cdkPortalOutlet]="modal.activePortal()"/>` })
class YearPortalHost {
  readonly controller = input.required<AddYearController>();
  readonly type = AddYearDrawerComponent;
  readonly inputs = computed(() => ({ controller: this.controller() }));
  readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  @ViewChild('drawer', { static: true }) drawer!: TemplateRef<unknown>;
  open(): void { this.modal.show(new TemplatePortal(this.drawer, this.view), { blockWorkspace: true }); }
}

describe('Group Add year slideout in Chromium', () => {
  let fixture: ComponentFixture<YearPortalHost>, root: HTMLElement;
  async function setup(count = 3) {
    TestBed.configureTestingModule({ imports: [YearPortalHost] });
    const state = setupYearController(count);
    fixture = TestBed.createComponent(YearPortalHost); fixture.nativeElement.removeAttribute('id'); fixture.componentRef.setInput('controller', state.controller);
    root = document.createElement('main'); root.className = 'v1-root'; document.body.append(root); root.append(fixture.nativeElement);
    fixture.detectChanges(); fixture.componentInstance.open(); await settle();
    return state;
  }
  async function settle() { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
  afterEach(() => { fixture?.destroy(); root?.remove(); });
  it('moves through equipment drafts with keyboard focus and saves once', async () => {
    const { controller: c, actions } = await setup();
    expect(document.activeElement?.textContent).toContain('2024');
    expect(root.querySelector('#add-year-input')).toBeNull();
    await page.getByRole('button', { name: 'Other', exact: true }).click(); await settle();
    expect(document.activeElement?.id).toBe('add-year-input');
    await page.getByRole('button', { name: 'Next item', exact: true }).click(); await settle();
    expect(c.index()).toBe(0); expect(document.activeElement?.id).toBe('equipment-year-title');
    await page.getByRole('spinbutton', { name: 'Operating hours for 2025' }).fill('3000');
    await page.getByRole('button', { name: 'Next item', exact: true }).click(); await settle();
    expect(c.completed()).toHaveLength(1); expect(root.querySelector('.creation-selections')?.textContent).toContain('Pump 0');
    expect(root.querySelector('.year-draft__remaining')?.textContent).toContain('Pump 2');
    const remainingTitle = getComputedStyle(root.querySelector('#remaining-equipment-title')!);
    expect(remainingTitle.borderBottomWidth).toBe('0px');
    expect(remainingTitle.paddingTop).toBe('0px');
    expect(remainingTitle.letterSpacing).toBe('normal');
    await page.getByRole('button', { name: 'Next item', exact: true }).click(); await settle();
    await page.getByRole('button', { name: 'Save all', exact: true }).click(); await settle();
    expect(actions.applyBatch).toHaveBeenCalledTimes(1); expect(c.dirty()).toBe(false);
  });
  it('returns to items skipped by direct selection and saves from the last unfinished item', async () => {
    const { controller: c, actions } = await setup(9);
    await page.getByRole('button', { name: '2024', exact: true }).click(); await settle();
    await page.getByRole('button', { name: 'Pump 2', exact: true }).click(); await settle();
    for (let index = 2; index < 9; index++) {
      expect(c.index()).toBe(index);
      expect(root.querySelector('.year-draft__heading p')?.textContent).toContain(`${index - 1} of 9 ·`);
      expect(root.querySelector('.year-draft__navigation')?.textContent).not.toContain('Save all');
      await page.getByRole('button', { name: 'Next item', exact: true }).click(); await settle();
    }
    expect(c.index()).toBe(0); expect(document.activeElement?.id).toBe('equipment-year-title');
    expect(root.querySelector('.year-draft__heading p')?.textContent).toContain('8 of 9 ·');
    await page.getByRole('button', { name: 'Next item', exact: true }).click(); await settle();
    expect(c.index()).toBe(1); expect(root.querySelector('.year-draft__remaining')).toBeNull();
    expect(root.querySelector('.year-draft__heading p')?.textContent).toContain('9 of 9 ·');
    await page.getByRole('button', { name: 'Save all', exact: true }).click(); await settle();
    expect(actions.applyBatch).toHaveBeenCalledTimes(1); expect(actions.applyBatch.mock.calls[0][1]).toHaveLength(9);
  });
  it('supports year cards by keyboard and Other validation in a narrow window', async () => {
    const { controller: c } = await setup(1);
    await page.viewport(390, 850); await settle();
    await userEvent.keyboard('{Enter}'); await settle();
    expect(c.selectedYear()).toBe(2024); expect(c.current()?.existing).toBe(true);
    await page.getByRole('button', { name: 'Previous', exact: true }).click(); await settle();
    await page.getByRole('button', { name: 'Other', exact: true }).click(); await settle();
    await page.getByRole('spinbutton', { name: 'Fiscal year', exact: true }).fill('10000');
    root.querySelector<HTMLFormElement>('#add-year-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settle();
    expect(c.index()).toBe(-1); expect(root.textContent).toContain('Enter a whole fiscal year');
    expect(root.querySelector<HTMLElement>('.year-draft__years')!.scrollWidth).toBeLessThanOrEqual(root.querySelector<HTMLElement>('.year-draft__years')!.clientWidth + 1);
  });
  it('keeps one blocking portal while calculators apply or cancel inside the draft', async () => {
    const { controller: c } = await setup(1); c.start(); await settle();
    const portal = fixture.componentInstance.modal.activePortal();
    await page.getByRole('button', { name: 'Calculate operating hours', exact: true }).click(); await settle();
    expect(fixture.componentInstance.modal.activePortal()).toBe(portal); expect(fixture.componentInstance.modal.workspaceBlocked()).toBe(true);
    expect(root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    await page.getByRole('spinbutton', { name: 'Hours per day', exact: true }).fill('6');
    await page.getByRole('button', { name: 'Apply', exact: true }).click(); await settle();
    expect(c.current()?.form?.controls.conditions.at(1).controls.hoursOfOperation.value).toBe(2184);
    expect(document.activeElement?.id).toBe('equipment-year-title');
    await page.getByRole('button', { name: 'Calculate load factor', exact: true }).click(); await settle();
    await userEvent.keyboard('{Escape}'); await settle();
    expect(c.confirmation()).toBeNull();
    expect(c.current()?.form?.controls.conditions.at(1).controls.loadFactor.value).toBe(50);
    await userEvent.keyboard('{Escape}'); await settle(); expect(c.confirmation()).toBe('discard');
    root.querySelector<HTMLButtonElement>('.v1-modal__footer button')!.click(); await settle(); expect(c.dirty()).toBe(true);
  });
  it('clears the table selection, closes the portal, and restores focus after Save all', async () => {
    await setup(1); fixture.componentInstance.modal.hide(); await settle();
    const table = TestBed.createComponent(EquipmentTableComponent);
    table.nativeElement.removeAttribute('id'); root.prepend(table.nativeElement); table.componentRef.setInput('canOpen', true); table.detectChanges();
    try {
      table.componentInstance.selection.selectAll(); table.detectChanges();
      await page.getByRole('button', { name: 'Add year', exact: true }).click(); await settle();
      await page.getByRole('button', { name: '2024', exact: true }).click(); await settle();
      await page.getByRole('button', { name: 'Save all', exact: true }).click(); await settle(); table.detectChanges(); await settle();
      expect(table.componentInstance.selection.selected()).toEqual([]);
      expect(fixture.componentInstance.modal.activePortal()).toBeNull();
      expect(document.activeElement).toBe(root.querySelector('.manage-items__table'));
    } finally { table.destroy(); }
  });
  it('wraps long names and retains reachable controls across widths and themes', async () => {
    const { controller: c, store } = await setup(1);
    c.discard(); store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map(item => ({ ...item, name: 'Long equipment name '.repeat(14) })) });
    c.open(['item-0']); c.start(); await settle();
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-contrast-strong']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; await settle();
      const panel = root.querySelector<HTMLElement>('.v1-workspace-slideout')!;
      await page.screenshot({ element: panel, path: `./__screenshots__/add-year-${width}-${theme || 'light'}.png` });
      expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
      const footer = root.querySelector<HTMLElement>('.v1-workspace-slideout__footer')!;
      expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(851);
      expect(root.querySelector<HTMLButtonElement>('.year-draft__navigation button:last-child')?.disabled).toBe(false);
    }
    await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}'); expect(root.contains(document.activeElement)).toBe(true);
  });
});
