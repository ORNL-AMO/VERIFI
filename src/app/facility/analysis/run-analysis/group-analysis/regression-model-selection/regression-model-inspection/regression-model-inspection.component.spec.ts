import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionModelInspectionComponent } from './regression-model-inspection.component';

describe('RegressionModelInspectionComponent', () => {
  let component: RegressionModelInspectionComponent;
  let fixture: ComponentFixture<RegressionModelInspectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegressionModelInspectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegressionModelInspectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
