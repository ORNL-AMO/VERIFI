import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailListSubscribe } from './email-list-subscribe.component';

describe('EmailListSubscribe', () => {
  let component: EmailListSubscribe;
  let fixture: ComponentFixture<EmailListSubscribe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmailListSubscribe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailListSubscribe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
