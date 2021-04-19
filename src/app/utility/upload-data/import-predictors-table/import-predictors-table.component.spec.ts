import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportPredictorsTableComponent } from './import-predictors-table.component';

describe('ImportPredictorsTableComponent', () => {
  let component: ImportPredictorsTableComponent;
  let fixture: ComponentFixture<ImportPredictorsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportPredictorsTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportPredictorsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
