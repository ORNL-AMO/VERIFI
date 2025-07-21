import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorStatisticsTableComponent } from './predictor-statistics-table.component';

describe('PredictorStatisticsTableComponent', () => {
  let component: PredictorStatisticsTableComponent;
  let fixture: ComponentFixture<PredictorStatisticsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorStatisticsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorStatisticsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
