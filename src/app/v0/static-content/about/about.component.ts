import { Component, OnInit } from '@angular/core';
import { ElectronService } from '@platform/electron/electron.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.css'],
    standalone: false
})
export class AboutComponent implements OnInit {

  isElectron: boolean;
  constructor(private electronService: ElectronService) { }

  ngOnInit(): void {
    this.isElectron = this.electronService.isElectron;
  }

}
