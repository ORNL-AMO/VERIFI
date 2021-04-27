import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUtilityBillComponent } from './edit-utility-bill.component';

describe('EditUtilityBillComponent', () => {
  let component: EditUtilityBillComponent;
  let fixture: ComponentFixture<EditUtilityBillComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditUtilityBillComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditUtilityBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
