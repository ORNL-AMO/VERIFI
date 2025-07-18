import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomGwpDashboardComponent } from './custom-gwp-dashboard.component';

describe('CustomGwpDashboardComponent', () => {
  let component: CustomGwpDashboardComponent;
  let fixture: ComponentFixture<CustomGwpDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomGwpDashboardComponent]
    });
    fixture = TestBed.createComponent(CustomGwpDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
