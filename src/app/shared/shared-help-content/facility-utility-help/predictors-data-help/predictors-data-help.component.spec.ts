import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsDataHelpComponent } from './predictors-data-help.component';

describe('PredictorsDataHelpComponent', () => {
  let component: PredictorsDataHelpComponent;
  let fixture: ComponentFixture<PredictorsDataHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorsDataHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PredictorsDataHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
