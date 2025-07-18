import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorTableComponent } from './predictor-table.component';

describe('PredictorTableComponent', () => {
  let component: PredictorTableComponent;
  let fixture: ComponentFixture<PredictorTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictorTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PredictorTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
