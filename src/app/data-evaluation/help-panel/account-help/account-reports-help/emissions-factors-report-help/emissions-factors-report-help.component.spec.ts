import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsFactorsReportHelpComponent } from './emissions-factors-report-help.component';

describe('EmissionsFactorsReportHelpComponent', () => {
  let component: EmissionsFactorsReportHelpComponent;
  let fixture: ComponentFixture<EmissionsFactorsReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmissionsFactorsReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsFactorsReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
