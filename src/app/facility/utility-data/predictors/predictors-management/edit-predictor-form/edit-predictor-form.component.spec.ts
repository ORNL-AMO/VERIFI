import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPredictorFormComponent } from './edit-predictor-form.component';

describe('EditPredictorFormComponent', () => {
  let component: EditPredictorFormComponent;
  let fixture: ComponentFixture<EditPredictorFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPredictorFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditPredictorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
