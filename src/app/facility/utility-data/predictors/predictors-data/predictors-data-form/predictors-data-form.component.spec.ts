import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsDataFormComponent } from './predictors-data-form.component';

describe('PredictorsDataFormComponent', () => {
  let component: PredictorsDataFormComponent;
  let fixture: ComponentFixture<PredictorsDataFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorsDataFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PredictorsDataFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
