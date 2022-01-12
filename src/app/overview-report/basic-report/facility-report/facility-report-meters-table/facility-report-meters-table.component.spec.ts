import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportMetersTableComponent } from './facility-report-meters-table.component';

describe('FacilityReportMetersTableComponent', () => {
  let component: FacilityReportMetersTableComponent;
  let fixture: ComponentFixture<FacilityReportMetersTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityReportMetersTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityReportMetersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
