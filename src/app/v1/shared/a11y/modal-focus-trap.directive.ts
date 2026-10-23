import { DOCUMENT } from '@angular/common';
import { FocusTrap, FocusTrapFactory, InteractivityChecker } from '@angular/cdk/a11y';
import { DestroyRef, Directive, ElementRef, HostListener, afterEveryRender, afterNextRender, inject, input, output } from '@angular/core';
import { ModalFocusStackService } from './modal-focus-stack.service';

/** CDK owns tabbing; this adapter owns the modal's focus and dismissal policy. */
@Directive({ selector: '[appModalFocusTrap]', standalone: true, host: { tabindex: '-1' } })
export class ModalFocusTrapDirective {
  readonly modalInitialFocus = input<string>();
  readonly modalFocusFallback = input<string>();
  readonly escapePressed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly checker = inject(InteractivityChecker);
  private readonly factory = inject(FocusTrapFactory);
  private readonly stack = inject(ModalFocusStackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly opener = this.document.activeElement;
  private trap?: FocusTrap;

  constructor() {
    afterNextRender(() => {
      if (this.destroyRef.destroyed || !this.host.isConnected) return;
      this.trap = this.factory.create(this.host);
      this.stack.activate(this.trap);
      this.focusInitial();
    });
    afterEveryRender(() => {
      if (!this.trap || !this.stack.isActive(this.trap)) return;
      const active = this.document.activeElement;
      // Browsers may blur a disabled control to the body or retain it as active.
      if (active === this.document.body ||
          (active instanceof HTMLElement && this.host.contains(active) && !this.checker.isFocusable(active))) {
        this.focusInitial();
      }
    });
    this.destroyRef.onDestroy(() => {
      if (!this.trap) return;
      const active = this.stack.remove(this.trap);
      this.trap.destroy();
      if (!active) return;
      if (this.focus(this.opener)) return;
      const fallback = this.modalFocusFallback();
      if (fallback) this.focus(this.document.querySelector<HTMLElement>(fallback));
    });
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.trap || !this.stack.isActive(this.trap)) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); this.escapePressed.emit();
    } else if (event.key === 'Tab' && this.document.activeElement === this.host) {
      // The container is the fallback when a dialog has no enabled controls.
      event.preventDefault();
      if (event.shiftKey) this.trap.focusLastTabbableElement();
      else this.trap.focusFirstTabbableElement();
    }
  }

  private focusInitial(): void {
    const target = this.modalInitialFocus();
    if (target && this.focus(this.host.querySelector<HTMLElement>(target))) return;
    if (!this.trap?.focusInitialElement()) this.host.focus({ preventScroll: true });
  }

  private focus(element: Element | null): boolean {
    if (!(element instanceof HTMLElement) || !element.isConnected || element.closest('[inert], [aria-hidden="true"]') || !this.checker.isFocusable(element)) return false;
    element.focus({ preventScroll: true });
    return this.document.activeElement === element;
  }
}
