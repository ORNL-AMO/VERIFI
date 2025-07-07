import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessPredictorsComponent } from './process-predictors.component';

describe('ProcessPredictorsComponent', () => {
  let component: ProcessPredictorsComponent;
  let fixture: ComponentFixture<ProcessPredictorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessPredictorsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessPredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
