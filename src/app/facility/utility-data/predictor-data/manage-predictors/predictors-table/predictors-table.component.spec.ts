import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorsTableComponent } from './predictors-table.component';

describe('PredictorsTableComponent', () => {
  let component: PredictorsTableComponent;
  let fixture: ComponentFixture<PredictorsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorsTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
