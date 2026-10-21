import { CdkMenuModule, CdkMenuTrigger } from '@angular/cdk/menu';
import { booleanAttribute, ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { IconComponent } from '../icons/icon.component';
import {
  ResourceBrowseCardAction,
  ResourceBrowseCardView
} from './resource-browse-card.models';

let nextResourceBrowseCardId = 0;

@Component({
  selector: 'app-resource-browse-card',
  templateUrl: './resource-browse-card.component.html',
  styleUrls: ['./resource-browse-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IconComponent, CdkMenuModule]
})
export class ResourceBrowseCardComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @Input() actionMenu = false;
  @ViewChild(CdkMenuTrigger) private menu?: CdkMenuTrigger;
  @ViewChild('actionMenuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  readonly menuClasses = signal('v1-root resource-action-menu');
  menuOpened(): void {
    const root = this.host.closest('.v1-root');
    this.menuClasses.set(['v1-root', 'resource-action-menu', ...[...(root?.classList ?? [])].filter(name => /^v1-(palette|theme|corners|contrast)-/.test(name))].join(' '));
  }
  selectMenuAction(action: ResourceBrowseCardAction): void {
    if (action.disabled || action.loading) return;
    this.menu?.close(); this.menuButton?.nativeElement.focus(); this.selectAction(action);
  }
  readonly idPrefix = `v1-resource-browse-card-${++nextResourceBrowseCardId}`;
  @Input({ required: true }) view!: ResourceBrowseCardView;
  @Input() actions: ReadonlyArray<ResourceBrowseCardAction> = [];
  @Input({ transform: booleanAttribute }) canOpen = true;
  @Input({ transform: booleanAttribute }) readOnly = false;

  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly actionSelected = new EventEmitter<string>();

  selectAction(action: ResourceBrowseCardAction): void {
    if (!action.disabled && !action.loading) {
      this.actionSelected.emit(action.id);
    }
  }
}
