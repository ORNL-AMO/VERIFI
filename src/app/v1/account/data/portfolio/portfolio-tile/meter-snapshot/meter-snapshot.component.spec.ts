import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import Invoice01Icon from '@hugeicons/core-free-icons/Invoice01Icon';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountDataModule } from '../../../account-data.module';
import { PortfolioMeterSnapshot } from '../../portfolio-inventory.models';
import { MeterSnapshotComponent } from './meter-snapshot.component';

const snapshot: PortfolioMeterSnapshot = {
  readingCount:24,rangeLabel:'Jan 2024 – Aug 2026',invalidDateCount:0,readingsLink:{label:'Open readings',route:['/meter','readings']},
  recentReadings:[{guid:'r3',dateLabel:'Aug 1, 2026',dateKey:'2026-08-01',tone:'neutral',quantityLabel:'Energy use',valueLabel:'0 kWh',description:'Aug 1, 2026. Energy use: 0 kWh'},
    {guid:'r2',dateLabel:'Jul 1, 2026',dateKey:'2026-07-01',tone:'danger',quantityLabel:'Energy use',valueLabel:'-40 kWh',statusLabel:'Has errors',icon:'danger',description:'Jul 1, 2026. Energy use: -40 kWh. Has errors. Review negative readings'},
    {guid:'r1',dateLabel:'Jun 1, 2026',dateKey:'2026-06-01',tone:'warning',quantityLabel:'Energy use',valueLabel:'25 kWh',statusLabel:'Has warnings',icon:'warning',description:'Jun 1, 2026. Energy use: 25 kWh. Has warnings. Review cost outliers'}],
  group:{label:'Meter group',value:'Main building',icon:'meterGroupItem',route:['/facility','meter-grouping','g','monthly-table']},facts:[],
  findings:[{id:'negative',name:'Electric',title:'Review negative readings',description:'Negative readings are not allowed',severity:'error',action:{label:'Review readings',route:['/meter','readings']}}],remainingFindings:2
};
function setup(detailed=false){
  TestBed.configureTestingModule({imports:[AccountDataModule],providers:[provideRouter([])]});
  const fixture=TestBed.createComponent(MeterSnapshotComponent);
  fixture.componentRef.setInput('snapshot',snapshot);fixture.componentRef.setInput('meterName','Electric');fixture.componentRef.setInput('detailed',detailed);
  fixture.detectChanges();return fixture;
}
describe('meter reading snapshot presentation',()=>{
  it('shows the horizontal reading count and combined date range in Summary and reveals history, setup and findings only in Detailed',()=>{
    const fixture=setup(),root=fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.meter-snapshot__reading-heading')?.textContent).toContain('24');
    expect(fixture.debugElement.query(By.directive(IconComponent)).componentInstance.icon).toBe(Invoice01Icon);
    expect(root.textContent).toContain('Jan 2024 – Aug 2026');expect(root.querySelector('dl')).toBeNull();
    expect(root.querySelector('.meter-snapshot__history')).toBeNull();
    fixture.componentRef.setInput('detailed',true);fixture.detectChanges();
    expect(root.textContent).toContain('kWh');expect(root.textContent).not.toContain('Reading units');expect(root.querySelector('dl')).toBeNull();expect(root.textContent).toContain('2 more findings');
    expect(root.querySelector('[data-tone="danger"] app-ui-icon')).not.toBeNull();
    expect(root.querySelector('[data-tone="warning"] app-ui-icon')).not.toBeNull();
    const recent=root.querySelectorAll('.meter-snapshot__recent-reading');expect(recent).toHaveLength(3);
    expect(recent[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-08-01');
    expect(recent[1].getAttribute('aria-label')).toContain('Jul 1, 2026. Energy use: -40 kWh. Has errors. Review negative readings');
    expect(recent[2].getAttribute('aria-label')).toContain('Jun 1, 2026. Energy use: 25 kWh. Has warnings. Review cost outliers');
    expect(recent[0].querySelector('.meter-snapshot__reading-value')?.textContent?.trim()).toBe('0 kWh');
    expect(recent[1].textContent).toContain('-40 kWh');expect(root.textContent).not.toContain('Saved');
    expect(root.textContent).toContain('Last 3 saved entries');
  });
  it('opens readings and targeted findings while preserving native modified-link behavior',()=>{
    const fixture=setup(true),root=fixture.nativeElement as HTMLElement,navigate=vi.fn();fixture.componentInstance.navigationRequested.subscribe(navigate);
    const link=root.querySelector<HTMLAnchorElement>('.meter-snapshot__readings')!;
    expect(link.getAttribute('href')).toBe('/meter/readings');expect(link.getAttribute('aria-label')).toContain('24 saved readings for Electric');
    link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));expect(navigate).not.toHaveBeenCalled();
    link.click();expect(navigate).toHaveBeenCalledWith(['/meter','readings']);
    root.querySelector<HTMLAnchorElement>('.meter-snapshot__attention a')!.click();expect(navigate).toHaveBeenCalledTimes(2);
    navigate.mockClear();
    const recent=root.querySelector<HTMLAnchorElement>('.meter-snapshot__recent-reading')!;
    recent.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));expect(navigate).not.toHaveBeenCalled();
    recent.click();expect(navigate).toHaveBeenLastCalledWith(['/meter','readings']);
  });
  it('omits empty history and attention sections and explains invalid dates',()=>{
    const fixture=setup(true),root=fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('snapshot',{...snapshot,recentReadings:[],findings:[],remainingFindings:0,invalidDateCount:2});fixture.detectChanges();
    expect(root.querySelector('.meter-snapshot__recent-reading')).toBeNull();expect(root.querySelector('.meter-snapshot__attention')).toBeNull();
    expect(root.textContent).toContain('2 saved readings have an unusable date');
  });
});
