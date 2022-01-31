import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionModelSelectionComponent } from './regression-model-selection.component';

describe('RegressionModelSelectionComponent', () => {
  let component: RegressionModelSelectionComponent;
  let fixture: ComponentFixture<RegressionModelSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegressionModelSelectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegressionModelSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
