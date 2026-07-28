import { Component, inject, Signal } from '@angular/core';
import { EmailListSubscribeService } from './email-list-subscribe.service';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

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

  inHomeScreen: Signal<boolean> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects === '/welcome'),
      startWith(this.router.url === '/welcome')
    ),
    { initialValue: this.router.url === '/welcome' }
  );

  privacyNotice() {
    this.router.navigate(['/privacy']);
  }

  checkValid() {
    const email = this.subscriberEmail?.trim();
    this.invalidEmailMessage = this.emailSubscribeService.checkEmailValid(email);
  }

  submitSubscriber() {
    const email = this.subscriberEmail?.trim();
    this.invalidEmailMessage = this.emailSubscribeService.checkEmailValid(email);

    if (!email || this.invalidEmailMessage) {
      return;
    }

    this.emailSubscribeService.submitSubscriberEmail(email).subscribe();
  }
}
