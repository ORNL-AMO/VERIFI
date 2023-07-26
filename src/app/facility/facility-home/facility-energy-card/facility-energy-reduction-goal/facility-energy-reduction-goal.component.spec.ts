import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyReductionGoalComponent } from './facility-energy-reduction-goal.component';

describe('FacilityEnergyReductionGoalComponent', () => {
  let component: FacilityEnergyReductionGoalComponent;
  let fixture: ComponentFixture<FacilityEnergyReductionGoalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilityEnergyReductionGoalComponent]
    });
    fixture = TestBed.createComponent(FacilityEnergyReductionGoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
