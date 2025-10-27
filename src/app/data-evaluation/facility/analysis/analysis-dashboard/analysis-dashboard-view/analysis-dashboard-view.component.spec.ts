import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisDashboardViewComponent } from './analysis-dashboard-view.component';

describe('AnalysisDashboardViewComponent', () => {
  let component: AnalysisDashboardViewComponent;
  let fixture: ComponentFixture<AnalysisDashboardViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisDashboardViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisDashboardViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
