import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityMetersComponent } from './facility-meters.component';

describe('FacilityMetersComponent', () => {
  it('renders the parent workspace outlet without dashboard or workbench content', () => {
    const fixture: ComponentFixture<FacilityMetersComponent> = TestBed.configureTestingModule({
      imports: [FacilityMetersComponent],
      providers: [
        provideRouter([]),
        { provide: AccountWorkspaceStore, useValue: {} }
      ]
    }).createComponent(FacilityMetersComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-facility-meters')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Meter grouping');
    expect(fixture.nativeElement.textContent).not.toContain('Meter not found');
  });
});
