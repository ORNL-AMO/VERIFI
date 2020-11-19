import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditElectricBillComponent } from './edit-electric-bill.component';

describe('EditElectricBillComponent', () => {
  let component: EditElectricBillComponent;
  let fixture: ComponentFixture<EditElectricBillComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditElectricBillComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditElectricBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
