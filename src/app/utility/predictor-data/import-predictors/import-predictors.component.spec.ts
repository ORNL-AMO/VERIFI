import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportPredictorsComponent } from './import-predictors.component';

describe('ImportPredictorsComponent', () => {
  let component: ImportPredictorsComponent;
  let fixture: ComponentFixture<ImportPredictorsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportPredictorsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportPredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
