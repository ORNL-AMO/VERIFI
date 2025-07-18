import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsDataComponent } from './predictors-data.component';

describe('PredictorsDataComponent', () => {
  let component: PredictorsDataComponent;
  let fixture: ComponentFixture<PredictorsDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorsDataComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PredictorsDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
