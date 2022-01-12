import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewReportMenuComponent } from './overview-report-menu.component';

describe('OverviewReportMenuComponent', () => {
  let component: OverviewReportMenuComponent;
  let fixture: ComponentFixture<OverviewReportMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OverviewReportMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewReportMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
