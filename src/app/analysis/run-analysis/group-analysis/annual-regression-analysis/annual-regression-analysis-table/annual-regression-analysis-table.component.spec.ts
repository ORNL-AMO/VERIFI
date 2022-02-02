import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualRegressionAnalysisTableComponent } from './annual-regression-analysis-table.component';

describe('AnnualRegressionAnalysisTableComponent', () => {
  let component: AnnualRegressionAnalysisTableComponent;
  let fixture: ComponentFixture<AnnualRegressionAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualRegressionAnalysisTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualRegressionAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
