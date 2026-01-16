import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionModelComparison } from './regression-model-comparison';

describe('RegressionModelComparison', () => {
  let component: RegressionModelComparison;
  let fixture: ComponentFixture<RegressionModelComparison>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RegressionModelComparison]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegressionModelComparison);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
