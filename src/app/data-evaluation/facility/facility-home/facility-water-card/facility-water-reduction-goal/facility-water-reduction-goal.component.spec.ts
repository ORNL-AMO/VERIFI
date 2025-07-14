import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterReductionGoalComponent } from './facility-water-reduction-goal.component';

describe('FacilityWaterReductionGoalComponent', () => {
  let component: FacilityWaterReductionGoalComponent;
  let fixture: ComponentFixture<FacilityWaterReductionGoalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilityWaterReductionGoalComponent]
    });
    fixture = TestBed.createComponent(FacilityWaterReductionGoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
