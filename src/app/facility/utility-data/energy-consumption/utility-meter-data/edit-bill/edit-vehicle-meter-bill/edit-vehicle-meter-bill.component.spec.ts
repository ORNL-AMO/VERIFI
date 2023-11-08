import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditVehicleMeterBillComponent } from './edit-vehicle-meter-bill.component';

describe('EditVehicleMeterBillComponent', () => {
  let component: EditVehicleMeterBillComponent;
  let fixture: ComponentFixture<EditVehicleMeterBillComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditVehicleMeterBillComponent]
    });
    fixture = TestBed.createComponent(EditVehicleMeterBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
