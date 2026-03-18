import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupingResultsTableComponent } from './meter-grouping-results-table.component';

describe('MeterGroupingResultsTableComponent', () => {
  let component: MeterGroupingResultsTableComponent;
  let fixture: ComponentFixture<MeterGroupingResultsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterGroupingResultsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterGroupingResultsTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
