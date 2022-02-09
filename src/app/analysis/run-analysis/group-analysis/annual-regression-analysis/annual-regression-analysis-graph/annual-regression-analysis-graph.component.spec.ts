import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualRegressionAnalysisGraphComponent } from './annual-regression-analysis-graph.component';

describe('AnnualRegressionAnalysisGraphComponent', () => {
  let component: AnnualRegressionAnalysisGraphComponent;
  let fixture: ComponentFixture<AnnualRegressionAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualRegressionAnalysisGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualRegressionAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
