import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisDashboardHelpComponent } from './analysis-dashboard-help.component';

describe('AnalysisDashboardHelpComponent', () => {
  let component: AnalysisDashboardHelpComponent;
  let fixture: ComponentFixture<AnalysisDashboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisDashboardHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisDashboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
