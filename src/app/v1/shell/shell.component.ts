import { animate, group, query, stagger, style, transition, trigger } from '@angular/animations';
import { Component, DestroyRef, ViewEncapsulation, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AppearanceService } from '../appearance/appearance.service';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
  animations: [
    trigger('v1RouteMotion', [
      transition('* => welcome', [
        query(':enter', [
          style({
            position: 'absolute',
            inset: 0,
            width: '100%',
            overflow: 'auto'
          })
        ], { optional: true }),
        query(':enter .v1-welcome__motion-card', [
          style({ opacity: 0, transform: 'translateY(1rem)' }),
          stagger(45, [
            animate('260ms cubic-bezier(.2, .8, .2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ]),
      transition('welcome => workspace', [
        query(':enter, :leave', [
          style({
            position: 'absolute',
            inset: 0,
            width: '100%',
            overflow: 'hidden'
          })
        ], { optional: true }),
        query(':enter .v1-workspace > app-primary-rail, :enter .v1-workspace > app-section-nav, :enter .v1-workspace > .v1-workspace__main, :enter .v1-workspace > app-support-panel', [
          style({ opacity: 0, transform: 'translateY(1.35rem)' })
        ], { optional: true }),
        query(':leave .v1-welcome__motion-card', [
          stagger(35, [
            animate('210ms cubic-bezier(.4, 0, .2, 1)', style({ opacity: 0, transform: 'translateY(-1rem)' }))
          ])
        ], { optional: true }),
        query(':leave', [
          animate('80ms ease-out', style({ opacity: 0 }))
        ], { optional: true }),
        group([
          query(':enter', [
            animate('80ms ease-out', style({ opacity: 1 }))
          ], { optional: true }),
          query(':enter .v1-workspace > app-primary-rail, :enter .v1-workspace > app-section-nav, :enter .v1-workspace > .v1-workspace__main, :enter .v1-workspace > app-support-panel', [
            stagger(55, [
              animate('300ms cubic-bezier(.2, .8, .2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class ShellComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly appearance = inject(AppearanceService);
  readonly prefersReducedMotion = signal(this.resolveReducedMotionPreference());
  readonly routeMotion = signal(this.resolveRouteMotion());

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => this.routeMotion.set(this.resolveRouteMotion(event.urlAfterRedirects)));

    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event: MediaQueryListEvent) => this.prefersReducedMotion.set(event.matches);
    motionPreference.addEventListener('change', updatePreference);
    this.destroyRef.onDestroy(() => motionPreference.removeEventListener('change', updatePreference));
  }

  private resolveReducedMotionPreference(): boolean {
    return typeof window !== 'undefined'
      && !!window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private resolveRouteMotion(url = this.router.url): 'welcome' | 'workspace' {
    return url.split(/[?#]/, 1)[0].split('/').filter(Boolean).includes('workspace') ? 'workspace' : 'welcome';
  }
}
