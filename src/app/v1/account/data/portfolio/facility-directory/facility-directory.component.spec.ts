import { TestBed } from '@angular/core/testing';
import { AccountDataModule } from '../../account-data.module';
import { PortfolioFacilityView } from '../portfolio-facility.view';
import { FacilityDirectoryComponent } from './facility-directory.component';

describe('FacilityDirectoryComponent', () => {
  it('renders a stable directory of 64 real-shaped facilities without resource counts and emits typed GUIDs', () => {
    TestBed.configureTestingModule({ imports: [AccountDataModule] });
    const fixture = TestBed.createComponent(FacilityDirectoryComponent);
    const facilities = Array.from({ length: 64 }, (_, index) => ({
      facility: { guid: `facility-${index}`, name: `Manufacturing facility ${index} with a long descriptive name` },
      location: 'Oak Ridge, TN', tone: index % 2 ? 'danger' : 'neutral', icon: index % 2 ? 'danger' : 'info',
      statusLabel: index % 2 ? 'Has errors' : 'Checks unavailable'
    } as PortfolioFacilityView));
    fixture.componentRef.setInput('facilities', facilities);
    const opened = vi.fn();
    fixture.componentInstance.openFacility.subscribe(opened);
    fixture.detectChanges();
    const tiles = fixture.nativeElement.querySelectorAll('.facility-directory__entry');
    expect(tiles).toHaveLength(64);
    expect(tiles[0].textContent).toContain('Checks unavailable');
    expect(tiles[1].textContent).toContain('Has errors');
    expect(fixture.nativeElement.textContent).not.toContain('Meters');
    expect(fixture.nativeElement.textContent).not.toContain('Oak Ridge, TN');
    tiles[42].click();
    expect(opened).toHaveBeenCalledWith('facility-42');
  });
  it('retains error and warning labels and keeps healthy status accessible', () => {
    TestBed.configureTestingModule({ imports: [AccountDataModule] });
    const fixture = TestBed.createComponent(FacilityDirectoryComponent);
    const facilities = [
      { tone: 'danger', icon: 'danger', statusLabel: 'Has errors' },
      { tone: 'warning', icon: 'warning', statusLabel: 'Has warnings' },
      { tone: 'success', icon: 'success', statusLabel: 'No active findings' }
    ].map((status, index) => ({ ...status, facility: { guid: `facility-${index}`, name: `Plant ${index}` }, location: '' } as PortfolioFacilityView));
    fixture.componentRef.setInput('facilities', facilities);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-tone="danger"] .facility-directory__status').textContent).toContain('Has errors');
    expect(fixture.nativeElement.querySelector('[data-tone="warning"] .facility-directory__status').textContent).toContain('Has warnings');
    expect(fixture.nativeElement.querySelector('[data-tone="success"] .facility-directory__status .visually-hidden').textContent).toBe('No active findings');
  });

});
