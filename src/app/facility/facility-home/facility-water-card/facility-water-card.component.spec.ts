import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterCardComponent } from './facility-water-card.component';

describe('FacilityWaterCardComponent', () => {
  let component: FacilityWaterCardComponent;
  let fixture: ComponentFixture<FacilityWaterCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilityWaterCardComponent]
    });
    fixture = TestBed.createComponent(FacilityWaterCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
