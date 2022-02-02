import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualRegressionAnalysisComponent } from './annual-regression-analysis.component';

describe('AnnualRegressionAnalysisComponent', () => {
  let component: AnnualRegressionAnalysisComponent;
  let fixture: ComponentFixture<AnnualRegressionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualRegressionAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualRegressionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
