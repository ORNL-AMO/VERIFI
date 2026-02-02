import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesSummaryComponent } from './facility-energy-uses-summary.component';

describe('FacilityEnergyUsesSummaryComponent', () => {
  let component: FacilityEnergyUsesSummaryComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
