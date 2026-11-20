import { Component, inject } from '@angular/core';
import { HomeEditor } from '../home-editor.service';
import { HomeContext } from '../home-context.service';

@Component({ selector: 'app-home-nav', standalone: false, templateUrl: './home-nav.component.html', styleUrls: ['./home-nav.component.css'] })
export class HomeNavComponent { readonly home = inject(HomeContext); readonly editor = inject(HomeEditor); }
