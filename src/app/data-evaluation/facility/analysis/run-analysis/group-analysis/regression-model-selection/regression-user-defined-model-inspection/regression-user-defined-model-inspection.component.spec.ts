import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionUserDefinedModelInspectionComponent } from './regression-user-defined-model-inspection.component';

describe('RegressionUserDefinedModelInspectionComponent', () => {
  let component: RegressionUserDefinedModelInspectionComponent;
  let fixture: ComponentFixture<RegressionUserDefinedModelInspectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RegressionUserDefinedModelInspectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegressionUserDefinedModelInspectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
