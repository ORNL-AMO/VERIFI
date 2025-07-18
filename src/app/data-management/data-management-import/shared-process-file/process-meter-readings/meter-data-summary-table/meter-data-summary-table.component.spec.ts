import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDataSummaryTableComponent } from './meter-data-summary-table.component';

describe('MeterDataSummaryTableComponent', () => {
  let component: MeterDataSummaryTableComponent;
  let fixture: ComponentFixture<MeterDataSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterDataSummaryTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterDataSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
