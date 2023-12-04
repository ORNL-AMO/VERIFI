import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsDonutComponent } from './emissions-donut.component';

describe('EmissionsDonutComponent', () => {
  let component: EmissionsDonutComponent;
  let fixture: ComponentFixture<EmissionsDonutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsDonutComponent]
    });
    fixture = TestBed.createComponent(EmissionsDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
