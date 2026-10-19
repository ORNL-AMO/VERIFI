import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountDataModule } from '../../../account-data.module';
import { PortfolioFacilitySnapshot } from '../../portfolio-inventory.models';
import { FacilitySnapshotComponent } from './facility-snapshot.component';

const snapshot: PortfolioFacilitySnapshot = {
  evaluation:'ready', address:'100 Industrial Drive, 00501', remainingFindings:3,
  resources:[{kind:'meters',label:'Meters',icon:'meter',route:['/facility','meters'],total:12,errorCount:1,warningCount:1,validCount:10},
    {kind:'predictors',label:'Predictors',icon:'predictor',route:['/facility','predictors'],total:0,errorCount:0,warningCount:0,validCount:0}],
  findings:[{id:'issue',name:'Boiler gas',title:'Add meter readings',description:'No readings have been entered.',severity:'error',action:{label:'Review readings',route:['/meter','readings']}}]
};
function setup(detailed = false) {
  TestBed.configureTestingModule({imports:[AccountDataModule],providers:[provideRouter([])]});
  const fixture=TestBed.createComponent(FacilitySnapshotComponent);
  fixture.componentRef.setInput('snapshot',snapshot); fixture.componentRef.setInput('facilityName','Plant'); fixture.componentRef.setInput('detailed',detailed);
  fixture.detectChanges(); return fixture;
}
describe('facility snapshot detail presentation', () => {
  it('shows compact linked inventory in Summary and adds distributions and targeted findings in Detailed', () => {
    const fixture=setup(), root=fixture.nativeElement as HTMLElement, navigate=vi.fn();
    fixture.componentInstance.navigationRequested.subscribe(navigate);
    const link=root.querySelector<HTMLAnchorElement>('.facility-snapshot__resource')!;
    expect(link.getAttribute('href')).toBe('/facility/meters');
    expect(link.textContent).toContain('12'); expect(root.textContent).not.toContain('100 Industrial');
    expect(root.querySelector('.facility-snapshot__attention')).toBeNull();
    link.click(); expect(navigate).toHaveBeenCalledWith(['/facility','meters']);
    fixture.componentRef.setInput('detailed',true); fixture.detectChanges();
    expect(root.textContent).toContain('2 need attention'); expect(root.textContent).toContain('No predictors yet');
    expect(root.textContent).toContain('Boiler gas'); expect(root.textContent).not.toContain('100 Industrial Drive');
    expect(root.textContent).toContain('3 more data findings');
    expect(link.getAttribute('aria-label')).toContain('1 with errors, 1 with warnings, 10 with all data valid');
    root.querySelector<HTMLAnchorElement>('.facility-snapshot__attention a')!.click(); expect(navigate).toHaveBeenLastCalledWith(['/meter','readings']);
    navigate.mockClear();
    link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,metaKey:true})); expect(navigate).not.toHaveBeenCalled();
  });
  it.each(['idle','evaluating','error'] as const)('shows %s checks without colored distributions or stale actions', state => {
    const fixture=setup(true), root=fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('snapshot',{...snapshot,evaluation:state,findings:[],remainingFindings:0});fixture.detectChanges();
    expect(root.querySelector('.facility-snapshot__strip')).toBeNull();
    expect(root.querySelector('.facility-snapshot__attention')).toBeNull();
    expect(root.textContent).toContain(state==='error'?'Checks unavailable':'Checks pending');
  });
});
