import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronService } from '../electron.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-electron-update',
  templateUrl: './electron-update.component.html',
  styleUrls: ['./electron-update.component.css'],
  animations: [
    trigger('updateToast', [
      state('show', style({ top: '40px' })),
      state('hide', style({ top: '-200px' })),
      transition('hide => show', animate('.5s ease')),
      transition('show => hide', animate('.5s ease'))
    ])
  ]
})
export class ElectronUpdateComponent implements OnInit {


  showUpdateAvailable: string = 'hide';

  updateAvailable: boolean;
  updateAvailableSub: Subscription;
  constructor(private electronService: ElectronService, private cd: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.electronService.sendAppReady('ready');
    this.updateAvailableSub = this.electronService.updateAvailable.subscribe(val => {
      this.updateAvailable = val;
      this.cd.detectChanges();
      if (this.updateAvailable) {
        setTimeout(() => {
          this.showUpdateAvailable = 'show';
          this.cd.detectChanges();
        }, 100)
      }
    });
  }

  ngOnDestroy() {
    this.updateAvailableSub.unsubscribe();
  }

  update() {
    this.electronService.sendUpdateSignal();
  }

  closeUpdateAvailable() {
    this.showUpdateAvailable = 'hide';
    setTimeout(() => {
      this.updateAvailable = false;
    }, 500)
  }
}
