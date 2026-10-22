import {
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output
} from '@angular/core';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** Owns focus containment, initial focus, Escape, and focus restoration for modal surfaces. */
@Directive({ selector: '[appModalFocusTrap]', standalone: true })
export class ModalFocusTrapDirective implements OnInit {
  readonly modalInitialFocus = input<string>();
  readonly modalFocusFallback = input<string>();
  readonly escapePressed = output<void>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private opener: Element | null = null;

  ngOnInit(): void {
    this.opener = document.activeElement;
    queueMicrotask(() => this.focusFirst());
    this.destroyRef.onDestroy(() => {
      if (this.opener instanceof HTMLElement && this.opener.isConnected) {
        this.opener.focus();
      } else {
        const fallback = this.modalFocusFallback();
        if (fallback) document.querySelector<HTMLElement>(fallback)?.focus();
      }
    });
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.escapePressed.emit();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = this.getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private getFocusable(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(element => !element.hidden && !element.closest('[hidden], [aria-hidden="true"]'));
  }

  private focusFirst(): void {
    const target = this.modalInitialFocus();
    const focusable = this.getFocusable();
    const first = (target ? focusable.find(element => element.matches(target)) : undefined) ?? focusable[0];
    if (first) {
      first.focus();
      return;
    }
    this.element.nativeElement.setAttribute('tabindex', '-1');
    this.element.nativeElement.focus();
  }
}
