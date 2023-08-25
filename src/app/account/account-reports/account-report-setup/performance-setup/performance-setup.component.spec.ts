import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceSetupComponent } from './performance-setup.component';

describe('PerformanceSetupComponent', () => {
  let component: PerformanceSetupComponent;
  let fixture: ComponentFixture<PerformanceSetupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PerformanceSetupComponent]
    });
    fixture = TestBed.createComponent(PerformanceSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
