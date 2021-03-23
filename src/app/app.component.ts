import { Component } from '@angular/core';
import { ElectronService } from './electron/electron.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'verifi';

  constructor(private electronService: ElectronService) {
  }

  ngOnInit() {
    console.log('init');
    this.electronService.send('ready');

    // this.electronService.on();

  }
}
