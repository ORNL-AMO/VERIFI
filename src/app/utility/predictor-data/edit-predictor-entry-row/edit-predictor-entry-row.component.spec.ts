import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPredictorEntryRowComponent } from './edit-predictor-entry-row.component';

describe('EditPredictorEntryRowComponent', () => {
  let component: EditPredictorEntryRowComponent;
  let fixture: ComponentFixture<EditPredictorEntryRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditPredictorEntryRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditPredictorEntryRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
