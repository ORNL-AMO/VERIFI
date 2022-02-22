import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportInfoComponent } from './facility-report-info.component';

describe('FacilityReportInfoComponent', () => {
  let component: FacilityReportInfoComponent;
  let fixture: ComponentFixture<FacilityReportInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityReportInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityReportInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
