import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySepReportsDashboardComponent } from './facility-sep-reports-dashboard.component';

describe('FacilitySepReportsDashboardComponent', () => {
  let component: FacilitySepReportsDashboardComponent;
  let fixture: ComponentFixture<FacilitySepReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySepReportsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySepReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
