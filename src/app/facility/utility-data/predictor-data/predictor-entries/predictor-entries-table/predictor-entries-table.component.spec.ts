import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorEntriesTableComponent } from './predictor-entries-table.component';

describe('PredictorEntriesTableComponent', () => {
  let component: PredictorEntriesTableComponent;
  let fixture: ComponentFixture<PredictorEntriesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PredictorEntriesTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorEntriesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
