import { Component, inject } from '@angular/core';
import { BetterPlantsEditor } from '../../editing/better-plants-editor.service';

@Component({ selector: 'app-better-plants-setup-page', standalone: false,
  templateUrl: './better-plants-setup-page.component.html', styleUrls: ['./better-plants-setup-page.component.css'] })
export class BetterPlantsSetupPageComponent { readonly editor = inject(BetterPlantsEditor); }
