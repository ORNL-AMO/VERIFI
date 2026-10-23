import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, NgZone, Output, inject } from '@angular/core';

/** Ordered row spans fit measured tile content without dense backfilling or DOM reordering. */
@Directive({ selector: '[appInventoryGrid]', standalone: true })
export class InventoryGridDirective implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private resize?: ResizeObserver;
  private mutation?: MutationObserver;
  private frame?: number;
  private destroyed = false;
  private lastSignature = '';
  private hasLaidOut = false;
  private anchor?: { element: HTMLElement; top: number; scroll: HTMLElement; scrollTop: number };
  @Output() readonly layoutReady = new EventEmitter<boolean>();
  @Input() set appInventoryGrid(_value: string) {
    if (this.hasLaidOut) this.captureAnchor();
    queueMicrotask(() => { if (!this.destroyed) this.layoutReady.emit(false); });
    this.schedule();
  }
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(() => this.schedule()); this.resize.observe(this.host);
      }
      if (typeof MutationObserver !== 'undefined') {
        this.mutation = new MutationObserver(() => { this.observeTiles(); this.schedule(); });
        this.mutation.observe(this.host, { childList: true, subtree: true, characterData: true });
      }
      this.observeTiles(); this.schedule();
    });
  }
  private observeTiles(): void {
    this.resize?.disconnect(); this.resize?.observe(this.host);
    this.host.querySelectorAll<HTMLElement>('.portfolio-tile').forEach(tile => this.resize?.observe(tile));
  }
  private schedule(): void {
    if (this.destroyed || this.frame !== undefined || typeof requestAnimationFrame === 'undefined') return;
    this.frame = requestAnimationFrame(() => { this.frame = undefined; this.measure(); });
  }
  private measure(): void {
    if (this.destroyed) return;
    const tiles = [...this.host.querySelectorAll<HTMLElement>(':scope > li')];
    // A previous two-column span can create an implicit track after the viewport
    // narrows. Remove spans before counting the grid's actual available columns.
    for (const item of tiles) item.style.gridColumnEnd = '';
    const styles = getComputedStyle(this.host);
    const gap = parseFloat(styles.rowGap) || 12;
    const columns = styles.gridTemplateColumns.split(' ').filter(Boolean).length;
    const uniform = this.host.classList.contains('portfolio-inventory--uniform');
    const signature: string[] = [String(columns), String(uniform)];
    for (const item of tiles) {
      const tile = item.querySelector<HTMLElement>('.portfolio-tile');
      if (!tile) continue;
      if (uniform) {
        item.style.gridColumnEnd = ''; item.style.gridRowEnd = '';
        signature.push(String(tile.getBoundingClientRect().height));
        continue;
      }
      const span = item.dataset['wide'] === 'true' && columns > 1 ? 2 : 1;
      item.style.gridColumnEnd = `span ${span}`;
      const rows = Math.max(1, Math.ceil((tile.getBoundingClientRect().height + gap) / (8 + gap)));
      item.style.gridRowEnd = `span ${rows}`;
      signature.push(`${span}:${rows}`);
    }
    const next = signature.join('|');
    if (next !== this.lastSignature) { this.lastSignature = next; this.schedule(); return; }
    if (this.anchor?.element.isConnected && Math.abs(this.anchor.scroll.scrollTop - this.anchor.scrollTop) < 1) {
      this.anchor.scroll.scrollTop += this.anchor.element.getBoundingClientRect().top - this.anchor.top;
    }
    this.anchor = undefined;
    this.hasLaidOut = true;
    this.zone.run(() => this.layoutReady.emit(true));
  }
  private captureAnchor(): void {
    if (!this.host.isConnected || this.anchor) return;
    let scroll = this.host.parentElement;
    while (scroll && !/(auto|scroll|overlay)/.test(getComputedStyle(scroll).overflowY)) scroll = scroll.parentElement;
    scroll ??= (this.host.ownerDocument.scrollingElement as HTMLElement | null) ?? this.host.ownerDocument.documentElement;
    const top = scroll.getBoundingClientRect().top;
    const focused = this.host.contains(document.activeElement) ? (document.activeElement as HTMLElement).closest<HTMLElement>('li') : undefined;
    const element = focused ?? [...this.host.querySelectorAll<HTMLElement>(':scope > li')].find(item => item.getBoundingClientRect().bottom > top);
    if (element && scroll) this.anchor = { element, top: element.getBoundingClientRect().top, scroll, scrollTop: scroll.scrollTop };
  }
  ngOnDestroy(): void {
    this.destroyed = true; this.resize?.disconnect(); this.mutation?.disconnect();
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
  }
}
