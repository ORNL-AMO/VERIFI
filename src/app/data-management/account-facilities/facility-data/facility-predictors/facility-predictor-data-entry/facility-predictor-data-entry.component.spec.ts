import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorDataEntryComponent } from './facility-predictor-data-entry.component';

describe('FacilityPredictorDataEntryComponent', () => {
  let component: FacilityPredictorDataEntryComponent;
  let fixture: ComponentFixture<FacilityPredictorDataEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorDataEntryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityPredictorDataEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
