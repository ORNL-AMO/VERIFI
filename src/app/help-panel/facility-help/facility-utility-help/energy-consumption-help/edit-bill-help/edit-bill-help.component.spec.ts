import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBillHelpComponent } from './edit-bill-help.component';

describe('EditBillHelpComponent', () => {
  let component: EditBillHelpComponent;
  let fixture: ComponentFixture<EditBillHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditBillHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBillHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
