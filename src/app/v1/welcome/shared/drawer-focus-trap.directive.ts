import {
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  output
} from '@angular/core';

/** All element types that can receive keyboard focus. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Implements the modal focus lifecycle for v1 drawer panels:
 *   - Moves focus to the first focusable element when the drawer opens.
 *   - Traps Tab and Shift+Tab navigation within the drawer.
 *   - Emits `escapePressed` when the user presses Escape (host component decides
 *     whether to close, e.g. while a save is in progress).
 *   - Restores focus to the element that was active when the drawer opened.
 *
 * Apply to the `<aside class="v1-drawer" role="dialog" …>` element.
 */
@Directive({ selector: '[appDrawerFocusTrap]', standalone: true })
export class DrawerFocusTrapDirective implements OnInit {
  readonly escapePressed = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private opener: Element | null = null;

  ngOnInit(): void {
    this.opener = document.activeElement;
    // Defer one microtask so Angular has finished rendering the drawer.
    Promise.resolve().then(() => this.focusFirst());
    this.destroyRef.onDestroy(() => {
      if (this.opener instanceof HTMLElement) {
        this.opener.focus();
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

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private getFocusable(): HTMLElement[] {
    return Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
  }

  private focusFirst(): void {
    const focusable = this.getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // Fall back to making the drawer itself focusable so focus doesn't escape.
      this.el.nativeElement.setAttribute('tabindex', '-1');
      this.el.nativeElement.focus();
    }
  }
}
