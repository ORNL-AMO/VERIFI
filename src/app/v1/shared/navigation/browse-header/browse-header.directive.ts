import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';

@Directive({ selector: '[appBrowseHeader]', standalone: true, exportAs: 'browseHeader' })
export class BrowseHeaderDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appBrowseHeader!: HTMLElement;
  @Input({ required: true }) browseMarker!: HTMLElement;
  @Input() browseOffsetProperty = '--browse-sticky-height';
  readonly collapsed = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private resize?: ResizeObserver;
  private intersection?: IntersectionObserver;
  ngOnChanges(): void {
    this.resize?.disconnect(); this.intersection?.disconnect();
    if (!this.appBrowseHeader || !this.browseMarker) return;
    const measure = (height = this.appBrowseHeader.getBoundingClientRect().height) => this.host.style.setProperty(this.browseOffsetProperty, `${height}px`);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      // Layout dimensions stay accurate while a parent page is visually scaled.
      this.resize = new ResizeObserver(entries => measure(entries[0]?.borderBoxSize?.[0]?.blockSize));
      this.resize.observe(this.appBrowseHeader, { box: 'border-box' });
    }
    if (typeof IntersectionObserver !== 'undefined') {
      let root = this.host.parentElement;
      while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
      this.intersection = new IntersectionObserver(entries => this.collapsed.set(!entries[0].isIntersecting), { root });
      this.intersection.observe(this.browseMarker);
    }
  }
  ngOnDestroy(): void { this.resize?.disconnect(); this.intersection?.disconnect(); this.host.style.removeProperty(this.browseOffsetProperty); }
}
