import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmPredictorsComponent } from './confirm-predictors.component';

describe('ConfirmPredictorsComponent', () => {
  let component: ConfirmPredictorsComponent;
  let fixture: ComponentFixture<ConfirmPredictorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmPredictorsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmPredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
