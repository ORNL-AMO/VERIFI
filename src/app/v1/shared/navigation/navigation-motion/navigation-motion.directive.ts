import { Directive, ElementRef, Injector, OnDestroy, afterNextRender, effect, inject, input } from '@angular/core';

export type NavigationMotion = 'none' | 'drill-in' | 'drill-out' | 'peer';

/** Move the routed page as one surface, keeping its scroll pane and shell stationary. */
@Directive({ selector: '[appNavigationMotion]', standalone: true })
export class NavigationMotionDirective implements OnDestroy {
  readonly appNavigationMotion = input<NavigationMotion>('none');
  readonly navigationMotionKey = input.required<string>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private readonly print = window.matchMedia?.('print');
  private readonly stop = () => this.cancel();
  private animations: Animation[] = [];
  private generation = 0;

  constructor() {
    this.reduced?.addEventListener('change', this.stop);
    this.print?.addEventListener('change', this.stop);
    effect(() => {
      const motion = this.appNavigationMotion();
      this.navigationMotionKey();
      const generation = ++this.generation;
      this.cancel();
      if (motion === 'none') return;
      afterNextRender(() => {
        if (generation !== this.generation || this.reduced?.matches || this.print?.matches) return;
        const page = this.host.querySelector<HTMLElement>(':scope > router-outlet + *');
        if (!page || typeof page.animate !== 'function') return;
        const fade = motion === 'peer';
        const from = motion === 'drill-in' ? 'translateX(12px) scale(.99)' : 'translateX(-12px) scale(1.01)';
        this.animations.push(page.animate([
          { opacity: .65, ...(fade ? {} : { transform: from, transformOrigin: 'top center' }) },
          { opacity: 1, ...(fade ? {} : { transform: 'none', transformOrigin: 'top center' }) }
        ], { duration: fade ? 300 : 480, easing: 'cubic-bezier(.2, .8, .2, 1)' }));
      }, { injector: this.injector });
    });
  }

  private cancel(): void { this.animations.forEach(animation => animation.cancel()); this.animations = []; }
  ngOnDestroy(): void {
    ++this.generation;
    this.cancel();
    this.reduced?.removeEventListener('change', this.stop);
    this.print?.removeEventListener('change', this.stop);
  }
}
