import { Component } from '@angular/core';
import { RouterGuardService } from './router-guard-service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-shared-router-guard-modal',
  standalone: false,
  templateUrl: './shared-router-guard-modal.component.html',
  styleUrl: './shared-router-guard-modal.component.css',
})
export class SharedRouterGuardModalComponent {

  showModalSub: Subscription
  showModal: boolean = false;

  constructor(
    private routerGuardService: RouterGuardService
  ) { }

  ngOnInit() {
    this.showModalSub = this.routerGuardService.getShowModal().subscribe(show => {
      this.showModal = show;
    });
  }

  ngOnDestroy() {
    if (this.showModalSub) {
      this.showModalSub.unsubscribe();
    }
  }

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
  }
}
