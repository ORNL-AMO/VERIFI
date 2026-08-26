import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailListSubscribeService } from '@shared/email-list-subscribe/email-list-subscribe.service';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { EmailListSignupComponent } from './email-list-signup.component';

describe('EmailListSignupComponent', () => {
  let fixture: ComponentFixture<EmailListSignupComponent>;
  let submittedStatus: BehaviorSubject<'error' | 'success' | 'sending' | undefined>;
  let checkEmailValid: ReturnType<typeof vi.fn>;
  let submitSubscriberEmail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    submittedStatus = new BehaviorSubject<'error' | 'success' | 'sending' | undefined>(undefined);
    checkEmailValid = vi.fn(email => email?.includes('@') ? undefined : 'Please enter a valid email address.');
    submitSubscriberEmail = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [EmailListSignupComponent],
      providers: [
        { provide: EmailListSubscribeService, useValue: { submittedStatus, checkEmailValid, submitSubscriberEmail } }
      ]
    });
    fixture = TestBed.createComponent(EmailListSignupComponent);
    fixture.detectChanges();
  });

  it('validates email before submitting', () => {
    const component = fixture.componentInstance;
    component.email.setValue('bad-email');

    component.submitSubscriber();

    expect(submitSubscriberEmail).not.toHaveBeenCalled();
    expect(component.invalidEmailMessage).toContain('valid email');
  });

  it('submits valid email and renders success and error states', () => {
    const component = fixture.componentInstance;
    component.email.setValue('person@example.com');

    component.submitSubscriber();
    expect(submitSubscriberEmail).toHaveBeenCalledWith('person@example.com');

    submittedStatus.next('success');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('confirmation email');

    submittedStatus.next('error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('network connection');
  });

  it('keeps service errors contained in the component', () => {
    submitSubscriberEmail.mockReturnValueOnce(throwError(() => new Error('network')));
    fixture.componentInstance.email.setValue('person@example.com');

    expect(() => fixture.componentInstance.submitSubscriber()).not.toThrow();
  });
});
