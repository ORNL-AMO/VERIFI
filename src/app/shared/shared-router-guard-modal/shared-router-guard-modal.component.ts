import { Component, inject, Signal } from '@angular/core';
import { RouterGuardService } from './router-guard-service';
import { Subscription } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-shared-router-guard-modal',
  standalone: false,
  templateUrl: './shared-router-guard-modal.component.html',
  styleUrl: './shared-router-guard-modal.component.css',
})
export class SharedRouterGuardModalComponent {
  private routerGuardService: RouterGuardService = inject(RouterGuardService);

  showModal: Signal<boolean> = toSignal(this.routerGuardService.showModal, { initialValue: false });
  showSave: Signal<boolean> = toSignal(this.routerGuardService.showSave, { initialValue: true });

  onSave() {
    this.routerGuardService.setShowModal(false);
    this.routerGuardService.setModalAction('save');
  }

  onDiscard() {
    this.routerGuardService.setShowModal(false);
    this.routerGuardService.setModalAction('discard');
  }

  onClose() {
    this.routerGuardService.setShowModal(false);
    this.routerGuardService.setModalAction('cancel');
  }
}
