import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySavingsReportsDashboardComponent } from './facility-savings-reports-dashboard.component';

describe('FacilitySavingsReportsDashboardComponent', () => {
  let component: FacilitySavingsReportsDashboardComponent;
  let fixture: ComponentFixture<FacilitySavingsReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySavingsReportsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySavingsReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
