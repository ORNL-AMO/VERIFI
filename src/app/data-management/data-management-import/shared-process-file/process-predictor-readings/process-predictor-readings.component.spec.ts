import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessPredictorReadingsComponent } from './process-predictor-readings.component';

describe('ProcessPredictorReadingsComponent', () => {
  let component: ProcessPredictorReadingsComponent;
  let fixture: ComponentFixture<ProcessPredictorReadingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessPredictorReadingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessPredictorReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
