import { Component, inject, Signal } from '@angular/core';
import { EmailListSubscribeService } from './email-list-subscribe.service';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-email-list-subscribe',
  standalone: false,
  templateUrl: './email-list-subscribe.component.html',
  styleUrl: './email-list-subscribe.component.css',
})
export class EmailListSubscribeComponent {

  private router: Router = inject(Router);
  private emailSubscribeService: EmailListSubscribeService = inject(EmailListSubscribeService);

  subscriberEmail: string;
  invalidEmailMessage: string;
  submittedStatus: Signal<'error' | 'success' | 'sending'> = toSignal(this.emailSubscribeService.submittedStatus, { initialValue: undefined });

  privacyNotice() {
    this.router.navigate(['/privacy']);
  }

  checkValid() {
    this.invalidEmailMessage = this.emailSubscribeService.checkEmailValid(this.subscriberEmail);
  }

  submitSubscriber() {
    if (!this.invalidEmailMessage) {
      this.emailSubscribeService.submitSubscriberEmail(this.subscriberEmail).subscribe();
    }
  }
}
