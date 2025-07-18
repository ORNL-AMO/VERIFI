import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterDashboardComponent } from './water-dashboard.component';

describe('WaterDashboardComponent', () => {
  let component: WaterDashboardComponent;
  let fixture: ComponentFixture<WaterDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WaterDashboardComponent]
    });
    fixture = TestBed.createComponent(WaterDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
