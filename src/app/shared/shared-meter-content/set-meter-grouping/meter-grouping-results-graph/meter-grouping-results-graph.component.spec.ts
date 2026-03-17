import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupingResultsGraphComponent } from './meter-grouping-results-graph.component';

describe('MeterGroupingResultsGraphComponent', () => {
  let component: MeterGroupingResultsGraphComponent;
  let fixture: ComponentFixture<MeterGroupingResultsGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterGroupingResultsGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterGroupingResultsGraphComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
