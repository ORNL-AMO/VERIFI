import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsDataTableComponent } from './predictors-data-table.component';

describe('PredictorsDataTableComponent', () => {
  let component: PredictorsDataTableComponent;
  let fixture: ComponentFixture<PredictorsDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorsDataTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PredictorsDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
