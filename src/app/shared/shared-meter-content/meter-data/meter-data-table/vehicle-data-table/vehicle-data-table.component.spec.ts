import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleDataTableComponent } from './vehicle-data-table.component';

describe('VehicleDataTableComponent', () => {
  let component: VehicleDataTableComponent;
  let fixture: ComponentFixture<VehicleDataTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VehicleDataTableComponent]
    });
    fixture = TestBed.createComponent(VehicleDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
