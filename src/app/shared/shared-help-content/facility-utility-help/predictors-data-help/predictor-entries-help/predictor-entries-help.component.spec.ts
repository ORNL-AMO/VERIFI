import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorEntriesHelpComponent } from './predictor-entries-help.component';

describe('PredictorEntriesHelpComponent', () => {
  let component: PredictorEntriesHelpComponent;
  let fixture: ComponentFixture<PredictorEntriesHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorEntriesHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorEntriesHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
