import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMeterGroupingComponent } from './facility-meter-grouping.component';

describe('FacilityMeterGroupingComponent', () => {
  let component: FacilityMeterGroupingComponent;
  let fixture: ComponentFixture<FacilityMeterGroupingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMeterGroupingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityMeterGroupingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
