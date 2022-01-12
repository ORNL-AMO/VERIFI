import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewReportMenuHelpComponent } from './overview-report-menu-help.component';

describe('OverviewReportMenuHelpComponent', () => {
  let component: OverviewReportMenuHelpComponent;
  let fixture: ComponentFixture<OverviewReportMenuHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OverviewReportMenuHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewReportMenuHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
