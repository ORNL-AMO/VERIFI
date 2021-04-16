import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardHelpPanelComponent } from './dashboard-help-panel.component';

describe('DashboardHelpPanelComponent', () => {
  let component: DashboardHelpPanelComponent;
  let fixture: ComponentFixture<DashboardHelpPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardHelpPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardHelpPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
