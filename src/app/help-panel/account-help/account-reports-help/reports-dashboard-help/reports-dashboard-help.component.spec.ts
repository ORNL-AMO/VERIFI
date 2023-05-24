import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsDashboardHelpComponent } from './reports-dashboard-help.component';

describe('ReportsDashboardHelpComponent', () => {
  let component: ReportsDashboardHelpComponent;
  let fixture: ComponentFixture<ReportsDashboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportsDashboardHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsDashboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
