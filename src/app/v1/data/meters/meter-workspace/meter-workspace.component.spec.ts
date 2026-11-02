import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterWorkspaceComponent } from './meter-workspace.component';

describe('MeterWorkspaceComponent', () => {
  it('renders the parent workspace outlet without dashboard or workbench content', () => {
    const fixture: ComponentFixture<MeterWorkspaceComponent> = TestBed.configureTestingModule({
      imports: [MeterWorkspaceComponent],
      providers: [
        provideRouter([]),
        { provide: AccountWorkspaceStore, useValue: {} }
      ]
    }).createComponent(MeterWorkspaceComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-facility-meters')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Meter grouping');
    expect(fixture.nativeElement.textContent).not.toContain('Meter not found');
  });
});
