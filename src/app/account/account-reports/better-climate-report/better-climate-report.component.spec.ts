import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterClimateReportComponent } from './better-climate-report.component';

describe('BetterClimateReportComponent', () => {
  let component: BetterClimateReportComponent;
  let fixture: ComponentFixture<BetterClimateReportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BetterClimateReportComponent]
    });
    fixture = TestBed.createComponent(BetterClimateReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
