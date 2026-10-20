import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { cdp } from 'vitest/browser';
import { NavigationMotion, NavigationMotionDirective } from './navigation-motion.directive';

@Component({ selector: 'app-motion-page', standalone: true, host: { style: 'display:block' }, template: `
  <header>Page heading</header>
  <form><input aria-label="Search meters"></form>
  <section><button>Meter</button></section>
  <section><canvas aria-label="Monthly chart"></canvas></section>
  <footer>Meter details</footer>` })
class MotionPage { }

@Component({ standalone: true, imports: [NavigationMotionDirective, RouterOutlet], template: `
  <div class="background" style="background:linear-gradient(45deg,#254859,#78bad3)">
    <nav>Account navigation</nav>
    <main [appNavigationMotion]="motion()" [navigationMotionKey]="route()">
      <router-outlet/>
    </main>
  </div>` })
class MotionHost {
  readonly motion = signal<NavigationMotion>('none');
  readonly route = signal('account');
}

describe('navigation motion in Chromium', () => {
  async function media(reduced = false, print = false): Promise<void> {
    const session = cdp() as { send(command: string, parameters: { media: string; features: { name: string; value: string }[] }): Promise<void> };
    await session.send('Emulation.setEmulatedMedia', {
      media: print ? 'print' : '', features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]
    });
  }
  afterEach(async () => { await media(); });

  async function createPage() {
    TestBed.configureTestingModule({ imports: [MotionHost], providers: [provideRouter([
      { path: 'account', component: MotionPage },
      { path: ':page', component: MotionPage }
    ])] });
    const fixture = TestBed.createComponent(MotionHost); fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/account'); fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('moves the whole reused routed page together, reverses returns, fades peers, and keeps the shell stationary', async () => {
    await media();
    const fixture = await createPage();
    const host: HTMLElement = fixture.nativeElement;
    let page = host.querySelector('app-motion-page')!;
    const accountPage = page;
    const enter = async (route: string, motion: NavigationMotion) => {
      await TestBed.inject(Router).navigateByUrl(`/${route}`);
      fixture.componentInstance.route.set(route); fixture.componentInstance.motion.set(motion); fixture.detectChanges();
      await fixture.whenStable();
      page = host.querySelector('app-motion-page')!;
      const animation = page.getAnimations()[0];
      expect(animation).toBeDefined();
      animation.pause();
      return animation;
    };
    const facility = await enter('facility', 'drill-in');
    expect(page).not.toBe(accountPage);
    const chart = page.querySelector('canvas')!;
    const inward = new DOMMatrix((facility.effect as KeyframeEffect).getKeyframes()[0]['transform'] as string);
    expect(inward.m41).toBeGreaterThan(0); expect(inward.m11).toBeLessThan(1);
    expect(host.querySelector('main')!.getAnimations({ subtree: true })).toHaveLength(1);
    for (const element of page.querySelectorAll('header, form, section, canvas, footer')) {
      expect(element.closest('app-motion-page')).toBe(page);
      expect(element.getAnimations()).toHaveLength(0);
    }
    const canvasWidth = chart.width;
    const meter = await enter('meter', 'drill-in');
    expect(facility.playState).toBe('idle');
    expect(meter).not.toBe(facility);
    const back = await enter('facility', 'drill-out');
    const outward = new DOMMatrix((back.effect as KeyframeEffect).getKeyframes()[0]['transform'] as string);
    expect(outward.m41).toBeLessThan(0); expect(outward.m11).toBeGreaterThan(1);
    const peer = await enter('other-facility', 'peer');
    expect((peer.effect as KeyframeEffect).getKeyframes()[0]['transform']).toBeUndefined();
    expect(chart.getAnimations()).toHaveLength(0);
    expect(chart.width).toBe(canvasWidth);
    for (const element of [host.querySelector('.background')!, host.querySelector('nav')!, host.querySelector('main')!]) {
      expect(element.getAnimations()).toHaveLength(0);
      expect(getComputedStyle(element).transform).toBe('none');
    }
    peer.play(); await peer.finished;
    expect(getComputedStyle(page).transform).toBe('none');
    expect(getComputedStyle(page).opacity).toBe('1');
    fixture.destroy();
    expect(page.getAnimations()).toHaveLength(0);
  });

  it('skips reduced-motion and print transitions, cancels active motion when preferences change', async () => {
    await media(true);
    const fixture = await createPage();
    const host: HTMLElement = fixture.nativeElement;
    fixture.componentInstance.route.set('facility'); fixture.componentInstance.motion.set('drill-in'); fixture.detectChanges(); await fixture.whenStable();
    expect(host.getAnimations({ subtree: true })).toHaveLength(0);
    await media(false, true);
    fixture.componentInstance.route.set('meter'); fixture.detectChanges(); await fixture.whenStable();
    expect(host.getAnimations({ subtree: true })).toHaveLength(0);
    await media();
    fixture.componentInstance.route.set('other-meter'); fixture.detectChanges(); await fixture.whenStable();
    expect(host.getAnimations({ subtree: true }).length).toBeGreaterThan(0);
    await media(true);
    await vi.waitFor(() => expect(host.getAnimations({ subtree: true })).toHaveLength(0));
    fixture.destroy();
  });
});
