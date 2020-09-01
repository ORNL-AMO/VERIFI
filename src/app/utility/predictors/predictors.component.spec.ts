import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsComponent } from './predictors.component';

describe('PredictorsComponent', () => {
  let component: PredictorsComponent;
  let fixture: ComponentFixture<PredictorsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PredictorsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
