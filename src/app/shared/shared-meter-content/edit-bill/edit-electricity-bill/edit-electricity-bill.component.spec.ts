import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditElectricityBillComponent } from './edit-electricity-bill.component';

describe('EditElectricityBillComponent', () => {
  let component: EditElectricityBillComponent;
  let fixture: ComponentFixture<EditElectricityBillComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditElectricityBillComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditElectricityBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
