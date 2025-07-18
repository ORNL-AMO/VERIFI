import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditConnectBillComponent } from './edit-connect-bill.component';

describe('EditConnectBillComponent', () => {
  let component: EditConnectBillComponent;
  let fixture: ComponentFixture<EditConnectBillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditConnectBillComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditConnectBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
