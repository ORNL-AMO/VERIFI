import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisDashboardTabsComponent } from './analysis-dashboard-tabs.component';

describe('AnalysisDashboardTabsComponent', () => {
  let component: AnalysisDashboardTabsComponent;
  let fixture: ComponentFixture<AnalysisDashboardTabsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AnalysisDashboardTabsComponent]
    });
    fixture = TestBed.createComponent(AnalysisDashboardTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
