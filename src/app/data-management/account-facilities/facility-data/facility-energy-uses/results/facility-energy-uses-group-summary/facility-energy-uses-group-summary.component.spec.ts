import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupSummaryComponent } from './facility-energy-uses-group-summary.component';

describe('FacilityEnergyUsesGroupSummaryComponent', () => {
  let component: FacilityEnergyUsesGroupSummaryComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
