import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ReportsSharedModule } from '../../reports-shared.module';
import { ReportPresentationController } from '../report-presentation-controller';

@Component({ standalone: true, imports: [ReportsSharedModule, PortalModule], providers: [ReportPresentationController], template: `
  <div class="v1-root">
    <div class="background" style="height:300px;overflow:auto" [attr.inert]="modal.workspaceBlocked() ? '' : null">
      @if (mounted()) {
        <app-report-presentation title="Analysis report" [content]="content" [available]="ready()"/>
      }
      <ng-template #content><article id="report-document" style="height:1600px">{{ value() }}</article></ng-template>
      @if (controller.available()) { <button type="button" (click)="controller.present()">Present</button> }
    </div>
    <ng-container [cdkPortalOutlet]="modal.activePortal()"/>
  </div>` })
class PresentationHost {
  readonly controller = inject(ReportPresentationController);
  readonly modal = inject(ModalPortalService);
  readonly ready = signal(true);
  readonly mounted = signal(true);
  readonly value = signal('Current report');
}

@Component({ standalone: true, template: '<p>Replacement modal</p>' })
class ReplacementModal {}

describe('report presentation lifecycle', () => {
  let fullscreen: Element | null;
  let request: ReturnType<typeof vi.fn>;
  let exit: ReturnType<typeof vi.fn>;
  const originalRequest = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'requestFullscreen');
  const originalElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
  const originalExit = Object.getOwnPropertyDescriptor(document, 'exitFullscreen');

  beforeEach(() => {
    fullscreen = null;
    request = vi.fn(function (this: HTMLElement) {
      fullscreen = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve();
    });
    exit = vi.fn(() => { fullscreen = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    for (const [object, key, original] of [[HTMLElement.prototype, 'requestFullscreen', originalRequest],
      [document, 'fullscreenElement', originalElement], [document, 'exitFullscreen', originalExit]] as const) {
      if (original) Object.defineProperty(object, key, original);
      else Reflect.deleteProperty(object, key);
    }
  });

  async function setup() {
    TestBed.configureTestingModule({ imports: [PresentationHost] });
    const fixture = TestBed.createComponent(PresentationHost);
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
    await settle();
    const host = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
    const open = async () => { root.querySelector<HTMLButtonElement>('.background button')!.click(); await settle(); };
    const close = async () => { root.querySelector<HTMLButtonElement>('.report-presentation__close')!.click(); await settle(); };
    return { fixture, host, root, open, close, settle };
  }

  it('renders one reactive document, requests fullscreen once, and restores the inline view on browser exit', async () => {
    const { root, host, open, settle } = await setup();
    expect(root.querySelectorAll('#report-document')).toHaveLength(1);
    await open(); host.controller.present(); await settle();
    expect(request).toHaveBeenCalledOnce();
    expect(fullscreen).toBe(root.querySelector('[role=dialog]'));
    expect(root.querySelectorAll('#report-document')).toHaveLength(1);
    expect(root.querySelector('[role=dialog] #report-document')).not.toBeNull();
    expect(host.modal.workspaceBlocked()).toBe(true);
    host.value.set('Updated report'); await settle();
    expect(root.querySelector('#report-document')?.textContent).toBe('Updated report');
    fullscreen = null; document.dispatchEvent(new Event('fullscreenchange')); await settle();
    expect(root.querySelector('[role=dialog]')).toBeNull();
    expect(root.querySelector('.background #report-document')).not.toBeNull();
    expect(host.modal.workspaceBlocked()).toBe(false);
    expect(exit).not.toHaveBeenCalled();
  });

  it.each(['denied', 'unsupported'] as const)('keeps a closable full-window presentation when fullscreen is %s', async mode => {
    if (mode === 'denied') request.mockRejectedValue(new Error('Denied'));
    else Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
    const { root, open, close } = await setup();
    await open();
    expect(root.querySelector('[role=dialog] [role=status]')?.textContent).toContain('Fullscreen is unavailable');
    await close();
    expect(root.querySelector('[role=dialog]')).toBeNull();
    expect(root.querySelectorAll('#report-document')).toHaveLength(1);
  });

  it('zooms in 10% steps within bounds and resets when a new presentation opens', async () => {
    const { root, open, close, settle } = await setup();
    await open();
    const zoomIn = root.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!;
    const zoomOut = root.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!;
    const percentage = root.querySelector<HTMLButtonElement>('[aria-label="Reset zoom to 100%"]')!;
    zoomIn.click(); await settle(); expect(percentage.textContent).toContain('110%');
    expect(root.querySelector('.report-presentation__zoom [role=status]')?.textContent).toContain('110%');
    for (let index = 0; index < 20; index++) zoomIn.click();
    await settle(); expect(percentage.textContent).toContain('200%'); expect(zoomIn.disabled).toBe(true);
    percentage.click(); await settle(); expect(percentage.textContent).toContain('100%'); expect(zoomIn.disabled).toBe(false);
    for (let index = 0; index < 20; index++) zoomOut.click();
    await settle(); expect(percentage.textContent).toContain('50%'); expect(zoomOut.disabled).toBe(true);
    expect(root.querySelectorAll('#report-document')).toHaveLength(1);
    await close(); await open();
    expect(root.querySelector('[aria-label="Reset zoom to 100%"]')?.textContent).toContain('100%');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('hides the action and closes when content becomes unavailable, releasing scrolling and stage registration', async () => {
    const { host, root, open, settle } = await setup();
    host.ready.set(false); await settle();
    host.controller.present(); expect(request).not.toHaveBeenCalled();
    expect(root.querySelector('.background button')).toBeNull();
    host.ready.set(true); await settle(); await open();
    expect((root.querySelector('.background') as HTMLElement).style.overflowY).toBe('hidden');
    host.ready.set(false); await settle();
    expect(root.querySelector('[role=dialog]')).toBeNull();
    expect(getComputedStyle(root.querySelector('.background')!).overflow).toBe('auto');
    expect(exit).toHaveBeenCalledOnce();
    host.mounted.set(false); await settle();
    expect(host.controller.available()).toBe(false);
  });

  it('does not replace another modal and does not remove a replacement portal on teardown', async () => {
    const { host, open, settle, fixture } = await setup();
    const replacement = new ComponentPortal(ReplacementModal);
    host.modal.show(replacement); host.controller.present(); await settle();
    expect(host.modal.activePortal()).toBe(replacement); expect(request).not.toHaveBeenCalled();
    host.modal.hide(); await settle(); await open();
    host.modal.show(replacement); await settle();
    fixture.destroy();
    expect(host.modal.activePortal()).toBe(replacement);
    expect(exit).toHaveBeenCalledOnce();
  });

  it('exits a late fullscreen completion after close and permits reentry', async () => {
    let complete!: () => void;
    let oldElement!: HTMLElement;
    request.mockImplementationOnce(function (this: HTMLElement) {
      oldElement = this;
      return new Promise<void>(resolve => { complete = resolve; });
    });
    const { root, open, close, settle } = await setup();
    await open(); await close();
    fullscreen = oldElement; complete(); await settle();
    expect(exit).toHaveBeenCalledOnce();
    expect(root.querySelector('[role=dialog]')).toBeNull();
    await open(); expect(root.querySelector('[role=dialog]')).not.toBeNull();
  });

  it('leaves a newer fullscreen owner intact when an old request settles', async () => {
    let complete!: () => void;
    request.mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const { root, open, close, settle } = await setup();
    await open(); await close(); await open();
    const current = fullscreen;
    complete(); await settle();
    expect(fullscreen).toBe(current); expect(root.querySelector('[role=dialog]')).toBe(current);
    expect(exit).not.toHaveBeenCalled();
  });

  it('releases scrolling and exits a late completion after the report stage is destroyed', async () => {
    let complete!: () => void;
    let element!: HTMLElement;
    request.mockImplementationOnce(function (this: HTMLElement) {
      element = this;
      return new Promise<void>(resolve => { complete = resolve; });
    });
    const { root, fixture, host, open } = await setup();
    await open(); fixture.destroy();
    expect(host.controller.available()).toBe(false); expect(host.modal.workspaceBlocked()).toBe(false);
    expect((root.querySelector('.background') as HTMLElement).style.overflowY).not.toBe('hidden');
    fullscreen = element; complete(); await Promise.resolve();
    expect(exit).toHaveBeenCalledOnce();
  });

  it('leaves independently owned fullscreen untouched and cleans up when destroyed during entry', async () => {
    const { fixture, root, open } = await setup();
    fullscreen = document.documentElement;
    await open(); expect(request).not.toHaveBeenCalled();
    fixture.destroy(); expect(exit).not.toHaveBeenCalled();
    expect((root.querySelector('.background') as HTMLElement).style.overflowY).not.toBe('hidden');
  });
});
