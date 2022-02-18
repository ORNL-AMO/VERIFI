import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPredictorsComponent } from './edit-predictors.component';

describe('EditPredictorsComponent', () => {
  let component: EditPredictorsComponent;
  let fixture: ComponentFixture<EditPredictorsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditPredictorsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditPredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
