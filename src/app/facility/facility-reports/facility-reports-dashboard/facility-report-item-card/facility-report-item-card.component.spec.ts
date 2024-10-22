import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportItemCardComponent } from './facility-report-item-card.component';

describe('FacilityReportItemCardComponent', () => {
  let component: FacilityReportItemCardComponent;
  let fixture: ComponentFixture<FacilityReportItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportItemCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
