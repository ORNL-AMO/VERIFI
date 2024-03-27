import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleFormComponent } from './vehicle-form.component';

describe('VehicleFormComponent', () => {
  let component: VehicleFormComponent;
  let fixture: ComponentFixture<VehicleFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VehicleFormComponent]
    });
    fixture = TestBed.createComponent(VehicleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
