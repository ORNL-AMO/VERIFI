import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewReportBannerComponent } from './overview-report-banner.component';

describe('OverviewReportBannerComponent', () => {
  let component: OverviewReportBannerComponent;
  let fixture: ComponentFixture<OverviewReportBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OverviewReportBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewReportBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
