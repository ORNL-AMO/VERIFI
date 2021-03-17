import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastNotificationsComponent } from './toast-notifications.component';

describe('ToastNotificationsComponent', () => {
  let component: ToastNotificationsComponent;
  let fixture: ComponentFixture<ToastNotificationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ToastNotificationsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ToastNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
