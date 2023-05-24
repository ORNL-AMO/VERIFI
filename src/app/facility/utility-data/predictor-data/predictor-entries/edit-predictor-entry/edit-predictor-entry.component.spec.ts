import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPredictorEntryComponent } from './edit-predictor-entry.component';

describe('EditPredictorEntryComponent', () => {
  let component: EditPredictorEntryComponent;
  let fixture: ComponentFixture<EditPredictorEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditPredictorEntryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPredictorEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
