import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculatedPredictorDataUpdateComponent } from './calculated-predictor-data-update.component';

describe('CalculatedPredictorDataUpdateComponent', () => {
  let component: CalculatedPredictorDataUpdateComponent;
  let fixture: ComponentFixture<CalculatedPredictorDataUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalculatedPredictorDataUpdateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CalculatedPredictorDataUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
