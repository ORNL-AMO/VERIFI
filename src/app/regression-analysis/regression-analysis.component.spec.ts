import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionAnalysisComponent } from './regression-analysis.component';

describe('RegressionAnalysisComponent', () => {
  let component: RegressionAnalysisComponent;
  let fixture: ComponentFixture<RegressionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegressionAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegressionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
