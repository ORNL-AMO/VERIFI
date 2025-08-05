import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorFormHelpComponent } from './predictor-form-help.component';

describe('PredictorFormHelpComponent', () => {
  let component: PredictorFormHelpComponent;
  let fixture: ComponentFixture<PredictorFormHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorFormHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorFormHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
