import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterClimateReportHelpComponent } from './better-climate-report-help.component';

describe('BetterClimateReportHelpComponent', () => {
  let component: BetterClimateReportHelpComponent;
  let fixture: ComponentFixture<BetterClimateReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BetterClimateReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BetterClimateReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
