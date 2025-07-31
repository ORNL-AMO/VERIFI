import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBillChargesComponent } from './edit-bill-charges.component';

describe('EditBillChargesComponent', () => {
  let component: EditBillChargesComponent;
  let fixture: ComponentFixture<EditBillChargesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditBillChargesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBillChargesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
