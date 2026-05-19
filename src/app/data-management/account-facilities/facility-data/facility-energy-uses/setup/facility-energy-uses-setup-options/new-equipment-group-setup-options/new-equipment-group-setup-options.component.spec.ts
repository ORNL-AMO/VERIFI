import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewEquipmentGroupSetupOptionsComponent } from './new-equipment-group-setup-options.component';

describe('NewEquipmentGroupSetupOptionsComponent', () => {
  let component: NewEquipmentGroupSetupOptionsComponent;
  let fixture: ComponentFixture<NewEquipmentGroupSetupOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewEquipmentGroupSetupOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewEquipmentGroupSetupOptionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
