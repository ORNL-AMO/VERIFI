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
  it('keeps Simple weather identity compact while retaining station repair warnings and expanded details', () => {
    const fixture=setup(),root=fixture.nativeElement as HTMLElement;
    const weather=portfolioTile('weather',{name:'Heating degree days',station:'Chicago Airport',chip:'Heating degree days · 65°F',simpleChip:'Heating degree days'});
    fixture.componentRef.setInput('tile',weather);fixture.detectChanges();
    expect(root.querySelector('.portfolio-tile__chip')?.textContent).toBe('Heating degree days');
    expect(root.querySelector('.portfolio-tile__station')).toBeNull();expect(root.textContent).not.toContain('65°F');
    for(const level of ['summary','detailed'] as const) {
      fixture.componentRef.setInput('level',level);fixture.detectChanges();
      expect(root.querySelector('.portfolio-tile__station')?.textContent).toBe('Chicago Airport');
      expect(root.querySelector('.portfolio-tile__chip')?.textContent).toContain('65°F');
    }
    fixture.componentRef.setInput('level','simple');
    fixture.componentRef.setInput('tile',{...weather,stationIssue:'Station required'});fixture.detectChanges();
    expect(root.querySelector('.portfolio-tile__station')?.textContent).toBe('Station required');
    expect(root.textContent).not.toContain('Chicago Airport');
    fixture.componentRef.setInput('tile',{...weather,stationIssue:'Station names differ'});fixture.detectChanges();
    expect(root.querySelector('.portfolio-tile__station')?.textContent).toBe('Station names differ');
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
  it('places the detailed meter group beside facility ownership and preserves native group links', () => {
    const fixture=setup(),root=fixture.nativeElement as HTMLElement,navigate=vi.fn();
    const meterSnapshot={readingCount:0,rangeLabel:'No readings yet',invalidDateCount:0,
      readingsLink:{label:'Open readings',route:['/meter','readings']},recentReadings:[],facts:[],findings:[],remainingFindings:0,
      group:{label:'Meter group',value:'Main building',icon:'meterGroupItem' as const,route:['/facility','meter-grouping','g','monthly-table']}};
    fixture.componentRef.setInput('tile',portfolioTile('m1',{owner:{label:'Plant',route:['/plant']},meterSnapshot}));
    fixture.componentRef.setInput('level','summary');fixture.detectChanges();
    expect(root.querySelector('.portfolio-tile__group')).toBeNull();
    fixture.componentRef.setInput('level','detailed');fixture.detectChanges();
    const group=root.querySelector<HTMLAnchorElement>('.portfolio-tile__ownership .portfolio-tile__group a')!;
    expect(group.textContent).toBe('Main building');expect(group.getAttribute('href')).toBe('/facility/meter-grouping/g/monthly-table');
    expect(root.textContent).not.toContain('Reading units');expect(root.querySelector('.reading-snapshot__facts')).toBeNull();
    fixture.componentInstance.navigationRequested.subscribe(navigate);
    group.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,metaKey:true}));expect(navigate).not.toHaveBeenCalled();
    group.click();expect(navigate).toHaveBeenCalledWith(meterSnapshot.group.route);
    fixture.componentRef.setInput('tile',portfolioTile('m1',{owner:{label:'Plant',route:['/plant']},
      meterSnapshot:{...meterSnapshot,group:{label:'Meter group',value:'Not assigned',icon:'meterGroupItem'}}}));fixture.detectChanges();
    expect(root.querySelector('.portfolio-tile__group')?.textContent).toContain('Not assigned');
    expect(root.querySelector('.portfolio-tile__group a')).toBeNull();
  });
});
