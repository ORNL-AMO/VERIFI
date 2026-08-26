import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { EmailListSubscribeService } from '@shared/email-list-subscribe/email-list-subscribe.service';

@Component({
  selector: 'app-email-list-signup',
  templateUrl: './email-list-signup.component.html',
  styleUrls: ['./email-list-signup.component.css'],
  imports: [FormsModule],
  standalone: true
})
export class EmailListSignupComponent {
  private readonly emailSubscribeService = inject(EmailListSubscribeService);

  readonly email = new FormControl('', { nonNullable: true });
  readonly submittedStatus = toSignal(this.emailSubscribeService.submittedStatus, { initialValue: undefined });
  invalidEmailMessage = '';

  setEmail(event: Event): void {
    this.email.setValue((event.target as HTMLInputElement).value);
    this.checkValid();
  }

  checkValid(): void {
    this.invalidEmailMessage = this.emailSubscribeService.checkEmailValid(this.email.value.trim()) || '';
  }

  submitSubscriber(): void {
    const email = this.email.value.trim();
    this.invalidEmailMessage = this.emailSubscribeService.checkEmailValid(email) || '';

    if (!email || this.invalidEmailMessage) {
      return;
    }

    this.emailSubscribeService.submitSubscriberEmail(email).subscribe({ error: () => undefined });
  }
}
