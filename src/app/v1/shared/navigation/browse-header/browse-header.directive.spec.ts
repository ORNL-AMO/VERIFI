import { Component, afterNextRender, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowseHeaderDirective } from './browse-header.directive';

@Component({ standalone: true, imports: [BrowseHeaderDirective], template: `
  <section [appBrowseHeader]="header" [browseMarker]="marker" [browseOffsetProperty]="offset()" #state="browseHeader">
    <span #marker></span><header #header>Inventory header</header><output>{{ state.collapsed() }}</output>
  </section>` })
class HeaderHost { readonly offset = signal<string | undefined>(undefined); }

interface ObserverRecord { callback: (entries: never[]) => void; disconnect: ReturnType<typeof vi.fn>; }

describe('browse header observation', () => {
  function setup() {
    const resize: ObserverRecord[] = [], intersection: ObserverRecord[] = [];
    const observer = (records: ObserverRecord[]) => class {
      readonly disconnect = vi.fn();
      constructor(callback: (entries: never[]) => void) { records.push({ callback, disconnect: this.disconnect }); }
      observe(): void {}
    };
    vi.stubGlobal('ResizeObserver', observer(resize));
    vi.stubGlobal('IntersectionObserver', observer(intersection));
    TestBed.configureTestingModule({ imports: [HeaderHost] });
    const fixture = TestBed.createComponent(HeaderHost);
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('header')!;
    const measure = vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 120 } as DOMRect);
    return { fixture, root, measure, resize, intersection };
  }
  afterEach(() => vi.unstubAllGlobals());

  it('tracks scrolling without reading header geometry or observing its size by default', async () => {
    const { fixture, root, measure, resize, intersection } = setup();
    fixture.detectChanges(); await fixture.whenStable();
    expect(measure).not.toHaveBeenCalled(); expect(resize).toHaveLength(0);
    intersection[0].callback([{ isIntersecting: false }] as never[]); fixture.detectChanges();
    expect(root.querySelector('output')!.textContent).toBe('true');
    fixture.destroy(); expect(intersection[0].disconnect).toHaveBeenCalledOnce();
  });

  it('measures only explicit routed-toolbar offsets and releases them when the option is removed', async () => {
    const { fixture, root, measure, resize, intersection } = setup();
    fixture.componentInstance.offset.set('--routed-toolbar-height'); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('section')!.style.getPropertyValue('--routed-toolbar-height')).toBe('120px');
    resize[0].callback([{ borderBoxSize: [{ blockSize: 180 }] }] as never[]);
    expect(root.querySelector('section')!.style.getPropertyValue('--routed-toolbar-height')).toBe('180px');
    expect(measure).toHaveBeenCalledOnce();
    fixture.componentInstance.offset.set(undefined); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('section')!.style.getPropertyValue('--routed-toolbar-height')).toBe('');
    expect(resize[0].disconnect).toHaveBeenCalled(); expect(intersection[0].disconnect).toHaveBeenCalled();
    expect(resize).toHaveLength(1);
    fixture.destroy();
  });

  it('does not attach observers when destroyed before the render callback', async () => {
    const { fixture, measure, resize, intersection } = setup();
    TestBed.runInInjectionContext(() => afterNextRender({ earlyRead: () => fixture.destroy() }));
    fixture.detectChanges(); await fixture.whenStable();
    expect(measure).not.toHaveBeenCalled(); expect(resize).toHaveLength(0); expect(intersection).toHaveLength(0);
  });
});
