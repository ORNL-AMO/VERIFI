import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionModelDetailsComponent } from './regression-model-details.component';

describe('RegressionModelDetailsComponent', () => {
  let component: RegressionModelDetailsComponent;
  let fixture: ComponentFixture<RegressionModelDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RegressionModelDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegressionModelDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
