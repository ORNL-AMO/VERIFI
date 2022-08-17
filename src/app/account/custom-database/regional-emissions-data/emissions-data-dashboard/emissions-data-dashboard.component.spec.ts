import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsDataDashboardComponent } from './emissions-data-dashboard.component';

describe('EmissionsDataDashboardComponent', () => {
  let component: EmissionsDataDashboardComponent;
  let fixture: ComponentFixture<EmissionsDataDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsDataDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsDataDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
