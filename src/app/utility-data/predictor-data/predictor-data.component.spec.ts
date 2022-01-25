import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorDataComponent } from './predictor-data.component';

describe('PredictorDataComponent', () => {
  let component: PredictorDataComponent;
  let fixture: ComponentFixture<PredictorDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PredictorDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PredictorDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
