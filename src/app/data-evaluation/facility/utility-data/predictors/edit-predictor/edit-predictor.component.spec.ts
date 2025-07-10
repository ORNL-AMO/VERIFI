import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPredictorComponent } from './edit-predictor.component';

describe('EditPredictorComponent', () => {
  let component: EditPredictorComponent;
  let fixture: ComponentFixture<EditPredictorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditPredictorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPredictorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
