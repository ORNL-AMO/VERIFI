import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipmentDetailsFormComponent } from './equipment-details-form.component';

describe('EquipmentDetailsFormComponent', () => {
  let component: EquipmentDetailsFormComponent;
  let fixture: ComponentFixture<EquipmentDetailsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EquipmentDetailsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipmentDetailsFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
