import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMeterComponent } from './facility-meter.component';

describe('FacilityMeterComponent', () => {
  let component: FacilityMeterComponent;
  let fixture: ComponentFixture<FacilityMeterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMeterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
