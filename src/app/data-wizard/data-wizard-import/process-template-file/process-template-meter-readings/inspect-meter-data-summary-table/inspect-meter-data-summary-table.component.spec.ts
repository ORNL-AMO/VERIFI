import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectMeterDataSummaryTableComponent } from './inspect-meter-data-summary-table.component';

describe('InspectMeterDataSummaryTableComponent', () => {
  let component: InspectMeterDataSummaryTableComponent;
  let fixture: ComponentFixture<InspectMeterDataSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InspectMeterDataSummaryTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectMeterDataSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
