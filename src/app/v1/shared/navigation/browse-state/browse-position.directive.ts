import { DestroyRef, Directive, ElementRef, HostListener, Injector, OnDestroy, afterNextRender, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { BrowseKey, BrowsePosition, BrowseStateService } from './browse-state.service';

@Directive({ selector: '[appBrowsePosition]', standalone: true })
export class BrowsePositionDirective implements OnDestroy {
  readonly appBrowsePosition = input<BrowseKey>();
  readonly browsePositionReady = input(true);
  readonly browseVisibleIds = input<readonly string[]>([]);
  readonly browseRestoreStickyGap = input(false);
  private readonly store = inject(BrowseStateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private key?: BrowseKey;
  private restored = false;
  private focusedId?: string;
  private destroyed = false;
  private departurePosition?: BrowsePosition;
  private returnHighlight?: Animation;
  private stickyRestore?: ResizeObserver;
  private stickyRestoreTimer?: ReturnType<typeof setTimeout>;
  private readonly stopStickyRestore = () => {
    this.stickyRestore?.disconnect(); this.stickyRestore = undefined;
    if (this.stickyRestoreTimer !== undefined) clearTimeout(this.stickyRestoreTimer);
    this.stickyRestoreTimer = undefined;
    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) this.host.ownerDocument.removeEventListener(event, this.stopStickyRestore, true);
  };
  private readonly reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private readonly print = window.matchMedia?.('print');
  private readonly stopHighlight = () => this.returnHighlight?.cancel();

  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.stopStickyRestore();
        // Removing a routed view can clamp its scroll pane before ngOnDestroy.
        this.departurePosition = { scrollTop: this.scrollRoot().scrollTop, focusId: this.focusedId };
        this.save();
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.departurePosition = undefined;
      } else if (event instanceof NavigationEnd) {
        afterNextRender(() => { this.departurePosition = undefined; }, { injector: this.injector });
      }
    });
    this.reduced?.addEventListener('change', this.stopHighlight);
    this.print?.addEventListener('change', this.stopHighlight);
    effect(() => {
      const key = this.appBrowsePosition();
      const ready = this.browsePositionReady();
      this.browseVisibleIds();
      untracked(() => {
        if (JSON.stringify(key) !== JSON.stringify(this.key)) {
          this.stopStickyRestore();
          this.stopHighlight(); this.save(); this.key = key; this.departurePosition = undefined; this.restored = false; this.focusedId = undefined;
        }
        if (!key || !ready || this.restored) return;
        this.restored = true;
        afterNextRender(() => {
          if (this.destroyed || JSON.stringify(this.key) !== JSON.stringify(key)) return;
          const saved = this.store.readPosition(key);
          const scope = this.host.closest('.v1-account-portfolio') ?? this.host;
          const heading = scope.querySelector<HTMLElement>('h1') ?? this.host.closest('.v1-facility-meters')?.querySelector<HTMLElement>('h1');
          const target = saved?.focusId ? [...this.host.querySelectorAll<HTMLElement>('[data-browse-id]')]
            .find(element => element.dataset['browseId'] === saved.focusId && element.getClientRects().length > 0) : undefined;
          // Restoring a scrolled account page closes its header gap on the following observer cycle.
          // Reapply the saved offset once after that resize; user input always cancels this correction.
          const sticky = this.browseRestoreStickyGap() && saved?.scrollTop ? scope.querySelector<HTMLElement>('.v1-account-portfolio__sticky') : undefined;
          if (sticky && typeof ResizeObserver !== 'undefined') {
            this.stopStickyRestore();
            const height = sticky.getBoundingClientRect().height;
            this.stickyRestore = new ResizeObserver(() => {
              if (this.destroyed || !this.stickyRestore || JSON.stringify(this.key) !== JSON.stringify(key)) return;
              if (Math.abs(sticky.getBoundingClientRect().height - height) < .5) return;
              this.scrollRoot().scrollTop = saved!.scrollTop;
              this.stopStickyRestore();
            });
            this.stickyRestore.observe(sticky, { box: 'border-box' });
            this.stickyRestoreTimer = setTimeout(this.stopStickyRestore, 500);
            for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) this.host.ownerDocument.addEventListener(event, this.stopStickyRestore, true);
          }
          (target ?? heading)?.focus({ preventScroll: true });
          this.scrollRoot().scrollTop = saved?.scrollTop ?? 0;
          if (target && !this.reduced?.matches && !this.print?.matches && typeof target.animate === 'function') {
            const accent = getComputedStyle(target).getPropertyValue('--v1-focus').trim() || 'Highlight';
            this.returnHighlight = target.animate([
              { outline: `2px solid ${accent}`, outlineOffset: '2px', offset: 0 },
              { outline: `2px solid ${accent}`, outlineOffset: '2px', offset: .3 },
              { outline: '2px solid transparent', outlineOffset: '2px', offset: 1 }
            ], { duration: 900, easing: 'ease-out' });
          }
        }, { injector: this.injector });
      });
    });
  }
  @HostListener('focusin', ['$event']) onFocus(event: FocusEvent): void {
    const target = event.composedPath()[0] as HTMLElement;
    const item = target.closest<HTMLElement>('[data-browse-id]');
    if (item && this.host.contains(item)) this.focusedId = item.dataset['browseId'];
  }
  private scrollRoot(): HTMLElement {
    let root = this.host.parentElement;
    while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    return root ?? (this.host.ownerDocument.scrollingElement as HTMLElement | null) ?? this.host.ownerDocument.documentElement;
  }
  private save(): void { if (this.key) this.store.savePosition(this.key, this.departurePosition ?? { scrollTop: this.scrollRoot().scrollTop, focusId: this.focusedId }); }
  ngOnDestroy(): void {
    this.stopStickyRestore();
    this.save(); this.destroyed = true;
    this.stopHighlight();
    this.reduced?.removeEventListener('change', this.stopHighlight);
    this.print?.removeEventListener('change', this.stopHighlight);
  }
}
