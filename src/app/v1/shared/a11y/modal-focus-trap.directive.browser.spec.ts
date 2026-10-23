import { Component, afterNextRender, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { ModalFocusTrapDirective } from './modal-focus-trap.directive';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Component({ standalone: true, imports: [ModalFocusTrapDirective], template: `
  <button id="modal-opener" [hidden]="hideOpener()" [disabled]="disableOpener()" (click)="shown.set(true)">Open modal</button>
  <button id="modal-fallback">Fallback</button>
  @if (shown()) {
    <section id="test-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading" appModalFocusTrap
      [modalInitialFocus]="initial()" modalFocusFallback="#modal-fallback" (escapePressed)="close()">
      <h2 id="modal-heading" tabindex="-1">Modal heading</h2>
      <button id="modal-first" [disabled]="busy()">First</button>
      <input type="hidden" value="saved">
      <button [disabled]="busy()" (click)="nested.set(true)">Open nested modal</button>
      <button id="modal-last" [disabled]="busy()">Last</button>
      <button style="display:none">CSS hidden last</button>
      <button style="visibility:hidden">Invisible last</button>
      <button tabindex="-1" [disabled]="busy()">Programmatic only</button>
      @if (nested()) {
        <section id="nested-modal" role="dialog" aria-label="Nested modal" aria-modal="true" appModalFocusTrap (escapePressed)="nested.set(false)">
          <button id="nested-first">Nested first</button><button id="nested-last">Nested last</button>
        </section>
      }
    </section>
  }` })
class ModalHost {
  readonly shown = signal(false);
  readonly nested = signal(false);
  readonly initial = signal<string | undefined>(undefined);
  readonly hideOpener = signal(false);
  readonly disableOpener = signal(false);
  readonly busy = signal(false);
  close(): void { if (!this.busy()) this.shown.set(false); }
}

async function setup(initial?: string) {
  TestBed.configureTestingModule({ imports: [ModalHost] });
  const fixture = TestBed.createComponent(ModalHost);
  fixture.componentInstance.initial.set(initial); fixture.detectChanges();
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
  await page.getByRole('button', { name: 'Open modal', exact: true }).click(); await settle();
  const root = fixture.nativeElement as HTMLElement;
  const find = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  return { fixture, host: fixture.componentInstance, root, find, settle };
}

describe('CDK-backed modal focus', () => {
  it('wraps real Tab navigation around visible tabbable controls and restores the opener', async () => {
    const { fixture, find, settle } = await setup();
    expect(document.activeElement).toBe(find('modal-first'));
    find('modal-last').focus(); await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(find('modal-first'));
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(find('modal-last'));
    await userEvent.keyboard('{Escape}'); await settle();
    expect(document.activeElement).toBe(find('modal-opener'));
    fixture.destroy();
  });

  it('allows a programmatically focusable heading as the initial target', async () => {
    const { fixture, find } = await setup('#modal-heading');
    expect(document.activeElement).toBe(find('modal-heading'));
    await userEvent.keyboard('{Tab}'); expect(document.activeElement).toBe(find('modal-first'));
    fixture.destroy();
  });

  it('keeps focus inside while controls are disabled, protects Escape, and resumes native tabbing after a save', async () => {
    const { fixture, host, find, settle } = await setup();
    find('modal-last').focus(); host.busy.set(true); await settle();
    expect(document.activeElement).toBe(find('test-modal'));
    await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}{Escape}'); await settle();
    expect(document.activeElement).toBe(find('test-modal')); expect(host.shown()).toBe(true);
    host.busy.set(false); await settle();
    await userEvent.keyboard('{Tab}'); expect(document.activeElement).toBe(find('modal-first'));
    fixture.destroy();
  });

  it.each(['hidden', 'disabled', 'removed'] as const)('uses the workflow fallback when the opener is %s', async state => {
    const { fixture, host, find, settle } = await setup();
    if (state === 'hidden') host.hideOpener.set(true);
    if (state === 'disabled') host.disableOpener.set(true);
    if (state === 'removed') find('modal-opener').remove();
    await settle(); await userEvent.keyboard('{Escape}'); await settle();
    expect(document.activeElement).toBe(find('modal-fallback'));
    fixture.destroy();
  });

  it('pauses the underlying trap and lets Escape close only the active nested modal', async () => {
    const { fixture, host, find, settle } = await setup();
    const opener = page.getByRole('button', { name: 'Open nested modal', exact: true });
    await opener.click(); await settle();
    expect(document.activeElement).toBe(find('nested-first'));
    find('nested-last').focus(); await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(find('nested-first'));
    await userEvent.keyboard('{Escape}'); await settle();
    expect(host.nested()).toBe(false); expect(host.shown()).toBe(true);
    expect(document.activeElement?.textContent).toBe('Open nested modal');
    await userEvent.keyboard('{Escape}'); await settle();
    expect(host.shown()).toBe(false); expect(document.activeElement).toBe(find('modal-opener'));
    fixture.destroy();
  });

  it('does not capture focus when destroyed before the render callback', async () => {
    TestBed.configureTestingModule({ imports: [ModalHost] });
    const fixture = TestBed.createComponent(ModalHost);
    fixture.componentInstance.shown.set(true);
    const outside = document.createElement('button'); document.body.append(outside);
    try {
      TestBed.runInInjectionContext(() => afterNextRender({ earlyRead: () => { fixture.destroy(); outside.focus(); } }));
      fixture.detectChanges(); await fixture.whenStable();
      expect(document.activeElement).toBe(outside);
      expect(document.querySelectorAll('.cdk-focus-trap-anchor')).toHaveLength(0);
    } finally { fixture.destroy(); outside.remove(); }
  });

  it('preserves confirmation busy guards with native focus containment and restores focus on teardown', async () => {
    TestBed.configureTestingModule({ imports: [ConfirmationDialogComponent] });
    const opener = document.createElement('button'); document.body.append(opener); opener.focus();
    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.componentRef.setInput('title', 'Delete item?'); fixture.componentRef.setInput('titleId', 'delete-item-title');
    fixture.componentRef.setInput('confirmLabel', 'Delete'); fixture.detectChanges(); await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button')];
    const cancelled = vi.fn(); fixture.componentInstance.cancelled.subscribe(cancelled);
    expect(document.activeElement).toBe(buttons[0]);
    buttons.at(-1)!.focus(); await userEvent.keyboard('{Tab}'); expect(document.activeElement).toBe(buttons[0]);
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges(); await fixture.whenStable();
    await userEvent.keyboard('{Tab}{Escape}'); expect(cancelled).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(dialog);
    fixture.destroy(); expect(document.activeElement).toBe(opener); opener.remove();
  });
});
