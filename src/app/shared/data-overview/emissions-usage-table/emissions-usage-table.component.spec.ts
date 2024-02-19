import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsUsageTableComponent } from './emissions-usage-table.component';

describe('EmissionsUsageTableComponent', () => {
  let component: EmissionsUsageTableComponent;
  let fixture: ComponentFixture<EmissionsUsageTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsUsageTableComponent]
    });
    fixture = TestBed.createComponent(EmissionsUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
