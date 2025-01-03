import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMeterDataComponent } from './facility-meter-data.component';

describe('FacilityMeterDataComponent', () => {
  let component: FacilityMeterDataComponent;
  let fixture: ComponentFixture<FacilityMeterDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMeterDataComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityMeterDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
