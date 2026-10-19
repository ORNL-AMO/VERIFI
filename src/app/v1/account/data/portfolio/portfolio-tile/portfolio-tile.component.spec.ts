import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountDataModule } from '../../account-data.module';
import { portfolioTile } from '../portfolio-inventory.testing';
import { PortfolioTileComponent } from './portfolio-tile.component';

describe('portfolio tile interactions and additive details', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [AccountDataModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PortfolioTileComponent);
    fixture.componentRef.setInput('tile', portfolioTile('m1', { location: 'Oak Ridge, TN', owner: { label: 'Plant', route: ['/plant'] },
      chip: 'Electricity', station: 'Station', findings: ['Missing readings'], detailLink: { label: 'View quality report', route: ['/quality'] } }));
    fixture.detectChanges(); return fixture;
  }
  it('shows identity, location, facility icon, and status in Simple; facts accumulate at higher levels', () => {
    const fixture = setup(), root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.portfolio-tile__location')?.textContent).toBe('Oak Ridge, TN');
    expect(root.querySelector('.portfolio-tile__owner svg')).not.toBeNull();
    expect(root.textContent).toContain('All data valid'); expect(root.querySelector('dl')).toBeNull();
    fixture.componentRef.setInput('level', 'summary'); fixture.detectChanges();
    expect(root.textContent).toContain('120'); expect(root.textContent).not.toContain('kWh');
    fixture.componentRef.setInput('level', 'detailed'); fixture.detectChanges();
    expect(root.textContent).toContain('120'); expect(root.textContent).toContain('kWh'); expect(root.textContent).toContain('Missing readings');
    expect(root.querySelector('.portfolio-tile__detail-link')?.getAttribute('href')).toBe('/quality');
  });
  it('emits typed navigation only for unmodified link clicks and leaves native link context menus intact', () => {
    const fixture = setup(), component = fixture.componentInstance;
    const navigate = vi.fn(); component.navigationRequested.subscribe(navigate);
    const link = fixture.nativeElement.querySelector('.portfolio-tile__name') as HTMLAnchorElement;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(navigate).not.toHaveBeenCalled();
    link.click(); expect(navigate).toHaveBeenCalledWith(['/facility', 'm1']);
    const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); link.dispatchEvent(context);
    expect(context.defaultPrevented).toBe(false);
    const owner = fixture.nativeElement.querySelector('.portfolio-tile__owner') as HTMLAnchorElement;
    owner.click(); expect(navigate).toHaveBeenLastCalledWith(['/plant']);
  });
  it('shows the full facility address once in the Detailed header even when there are no attention findings', () => {
    const fixture=setup(), root=fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('tile',portfolioTile('f', { location:'Oak Ridge, TN',
      facilitySnapshot:{evaluation:'ready',resources:[],findings:[],remainingFindings:0,address:'100 Industrial Drive, Oak Ridge, TN, 00501'} }));
    for(const level of ['simple','summary','detailed'] as const) {
      fixture.componentRef.setInput('level',level);fixture.detectChanges();
      const location=root.querySelector('.portfolio-tile__location')!;
      expect(location.textContent).toBe(level==='detailed'?'100 Industrial Drive, Oak Ridge, TN, 00501':'Oak Ridge, TN');
      expect(root.querySelector('.facility-snapshot__attention')).toBeNull();
    }
    expect(root.textContent?.match(/100 Industrial Drive/g)).toHaveLength(1);
    expect(root.querySelector('app-facility-snapshot')?.textContent).not.toContain('100 Industrial Drive');
  });
  it('emits GUID-keyed detail choices and inherits again without domain actions', () => {
    const fixture = setup(), changes = vi.fn(); fixture.componentInstance.detailChanged.subscribe(changes);
    fixture.componentInstance.choose('detailed'); fixture.componentInstance.choose(null);
    expect(changes.mock.calls).toEqual([[{ guid: 'm1', level: 'detailed' }], [{ guid: 'm1', level: null }]]);
    fixture.componentRef.setInput('print', true); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
