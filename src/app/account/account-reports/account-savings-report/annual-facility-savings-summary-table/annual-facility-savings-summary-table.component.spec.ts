import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualFacilitySavingsSummaryTableComponent } from './annual-facility-savings-summary-table.component';

describe('AnnualFacilitySavingsSummaryTableComponent', () => {
  let component: AnnualFacilitySavingsSummaryTableComponent;
  let fixture: ComponentFixture<AnnualFacilitySavingsSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualFacilitySavingsSummaryTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualFacilitySavingsSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
