import { AfterRenderRef, Directive, ElementRef, Injector, Input, OnChanges, OnDestroy, afterNextRender, inject, signal } from '@angular/core';

@Directive({ selector: '[appBrowseHeader]', standalone: true, exportAs: 'browseHeader' })
export class BrowseHeaderDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appBrowseHeader!: HTMLElement;
  @Input({ required: true }) browseMarker!: HTMLElement;
  /** Only needed when a routed child's toolbar cannot share the sticky wrapper. */
  @Input() browseOffsetProperty?: string;
  readonly collapsed = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private resize?: ResizeObserver;
  private intersection?: IntersectionObserver;
  private readonly injector = inject(Injector);
  private render?: AfterRenderRef;
  private offsetProperty?: string;
  ngOnChanges(): void {
    this.resize?.disconnect(); this.intersection?.disconnect();
    this.render?.destroy();
    this.render = afterNextRender(() => this.observe(), { injector: this.injector });
  }
  private observe(): void {
    if (this.offsetProperty) this.host.style.removeProperty(this.offsetProperty);
    this.offsetProperty = this.browseOffsetProperty;
    if (!this.appBrowseHeader || !this.browseMarker) return;
    if (this.offsetProperty) {
      const property = this.offsetProperty;
      const measure = (height = this.appBrowseHeader.getBoundingClientRect().height) => this.host.style.setProperty(property, `${height}px`);
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        // Use layout dimensions while a routed page is visually scaled.
        this.resize = new ResizeObserver(entries => measure(entries[0]?.borderBoxSize?.[0]?.blockSize));
        this.resize.observe(this.appBrowseHeader, { box: 'border-box' });
      }
    }
    if (typeof IntersectionObserver !== 'undefined') {
      let root = this.host.parentElement;
      while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
      this.intersection = new IntersectionObserver(entries => this.collapsed.set(!entries[0].isIntersecting), { root });
      this.intersection.observe(this.browseMarker);
    }
  }
  ngOnDestroy(): void {
    this.render?.destroy(); this.resize?.disconnect(); this.intersection?.disconnect();
    if (this.offsetProperty) this.host.style.removeProperty(this.offsetProperty);
  }
}
