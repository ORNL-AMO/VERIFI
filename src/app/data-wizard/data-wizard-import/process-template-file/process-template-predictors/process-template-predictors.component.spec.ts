import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessTemplatePredictorsComponent } from './process-template-predictors.component';

describe('ProcessTemplatePredictorsComponent', () => {
  let component: ProcessTemplatePredictorsComponent;
  let fixture: ComponentFixture<ProcessTemplatePredictorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessTemplatePredictorsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcessTemplatePredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
