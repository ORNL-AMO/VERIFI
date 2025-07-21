import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualSavingsSummaryTableComponent } from './annual-savings-summary-table.component';

describe('AnnualSavingsSummaryTableComponent', () => {
  let component: AnnualSavingsSummaryTableComponent;
  let fixture: ComponentFixture<AnnualSavingsSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualSavingsSummaryTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualSavingsSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
