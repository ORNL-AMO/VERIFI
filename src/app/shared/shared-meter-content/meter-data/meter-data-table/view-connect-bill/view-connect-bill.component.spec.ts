import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewConnectBillComponent } from './view-connect-bill.component';

describe('ViewConnectBillComponent', () => {
  let component: ViewConnectBillComponent;
  let fixture: ComponentFixture<ViewConnectBillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewConnectBillComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewConnectBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
