import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmPredictorsHelpComponent } from './confirm-predictors-help.component';

describe('ConfirmPredictorsHelpComponent', () => {
  let component: ConfirmPredictorsHelpComponent;
  let fixture: ComponentFixture<ConfirmPredictorsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmPredictorsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmPredictorsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
