import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorEntryFormHelpComponent } from './predictor-entry-form-help.component';

describe('PredictorEntryFormHelpComponent', () => {
  let component: PredictorEntryFormHelpComponent;
  let fixture: ComponentFixture<PredictorEntryFormHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorEntryFormHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorEntryFormHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
