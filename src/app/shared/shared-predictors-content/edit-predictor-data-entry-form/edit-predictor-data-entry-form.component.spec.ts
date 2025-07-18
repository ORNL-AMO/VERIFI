import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPredictorDataEntryFormComponent } from './edit-predictor-data-entry-form.component';

describe('EditPredictorDataEntryFormComponent', () => {
  let component: EditPredictorDataEntryFormComponent;
  let fixture: ComponentFixture<EditPredictorDataEntryFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditPredictorDataEntryFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPredictorDataEntryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
