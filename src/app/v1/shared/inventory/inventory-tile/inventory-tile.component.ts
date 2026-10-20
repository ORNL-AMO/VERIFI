import { CdkMenuModule, CdkMenuTrigger } from '@angular/cdk/menu';
import { FacilitySnapshotComponent } from '../facility-snapshot/facility-snapshot.component';
import { ReadingSnapshotComponent } from '../reading-snapshot/reading-snapshot.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventoryTileMenuAction, InventoryTileActionRequest, InventoryDetailLevel, InventoryTile, InventoryTileDetailChange } from '../inventory.models';

@Component({ selector: 'app-inventory-tile', standalone: true, imports: [IconComponent, CdkMenuModule, ReactiveFormsModule, FacilitySnapshotComponent, ReadingSnapshotComponent],
  templateUrl: './inventory-tile.component.html', styleUrls: ['./inventory-tile.component.css'] })
export class InventoryTileComponent {
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @Input({ required: true }) tile!: InventoryTile;
  @Input() level: InventoryDetailLevel = 'simple';
  @Input() print = false;
  @Input() actions: readonly InventoryTileMenuAction[] = [];
  @Input() selecting = false;
  @Input() selected = false;
  @Input() canSelect = true;
  @Output() readonly actionRequested = new EventEmitter<InventoryTileActionRequest>();
  @Output() readonly selectionChanged = new EventEmitter<{ guid: string; selected: boolean }>();
  readonly selectionControl = new FormControl(false, { nonNullable: true });
  @Output() readonly detailChanged = new EventEmitter<InventoryTileDetailChange>();
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  @ViewChild(CdkMenuTrigger) private trigger?: CdkMenuTrigger;
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  readonly menuClasses = signal('v1-root portfolio-tile-menu');
  private themeObserver?: MutationObserver;
  mainHref = '';
  ownerHref = '';
  groupHref = '';
  stationHref = '';
  locationLabel = '';
  chipLabel = '';
  stationLabel = '';
  constructor() {
    this.selectionControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(selected => this.selectionChanged.emit({ guid: this.tile.guid, selected }));
  }
  ngOnChanges(): void {
    this.selectionControl.setValue(this.selected, { emitEvent: false });
    if (this.canSelect) this.selectionControl.enable({ emitEvent: false }); else this.selectionControl.disable({ emitEvent: false });
    const href = (route: readonly string[]) => this.router.serializeUrl(this.router.createUrlTree([...route]));
    this.mainHref = href(this.tile.route);
    this.ownerHref = this.tile.owner ? href(this.tile.owner.route) : '';
    this.stationHref = this.tile.stationLink ? href(this.tile.stationLink.route) : '';
    this.groupHref = this.tile.meterSnapshot?.group.route ? href(this.tile.meterSnapshot.group.route) : '';
    this.chipLabel = (this.level === 'simple' ? this.tile.simpleChip ?? this.tile.chip : this.tile.chip) ?? '';
    this.stationLabel = (this.level === 'simple' ? this.tile.stationIssue : this.tile.station) ?? '';
    this.locationLabel = this.level === 'detailed' && this.tile.facilitySnapshot
      ? this.tile.facilitySnapshot.address : this.tile.location ?? '';
  }
  open(event: MouseEvent, route: readonly string[]): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this.navigationRequested.emit(route);
  }
  contextMenu(event: MouseEvent): void {
    if (this.print || (event.composedPath()[0] as HTMLElement)?.closest('a,button,input,select,textarea')) return;
    event.preventDefault(); this.openMenu();
  }
  menuKey(event: KeyboardEvent): void {
    if (!this.print && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
      event.preventDefault(); event.stopPropagation(); this.openMenu();
    }
  }
  private openMenu(): void {
    this.menuButton?.nativeElement.focus(); this.trigger?.open();
    queueMicrotask(() => document.getElementById(`portfolio-detail-${this.tile.guid}`)?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')?.focus());
  }
  menuOpened(): void {
    this.themeObserver?.disconnect();
    const root = this.host.closest('.v1-root');
    const sync = () => this.menuClasses.set(['v1-root', 'portfolio-tile-menu', ...[...(root?.classList ?? [])].filter(name => /^v1-(palette|theme|corners|contrast)-/.test(name))].join(' '));
    sync();
    if (root && typeof MutationObserver !== 'undefined') {
      this.themeObserver = new MutationObserver(sync); this.themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
    }
  }
  menuClosed(): void {
    this.themeObserver?.disconnect();
    queueMicrotask(() => { if (document.activeElement === document.body) this.menuButton?.nativeElement.focus(); });
  }
  choose(level: InventoryDetailLevel): void {
    this.detailChanged.emit({ guid: this.tile.guid, level });
    this.trigger?.close(); this.menuButton?.nativeElement.focus();
  }
  chooseAction(action: InventoryTileMenuAction): void {
    if (action.disabled) return;
    this.trigger?.close(); this.menuButton?.nativeElement.focus();
    this.actionRequested.emit({ guid: this.tile.guid, action: action.id });
  }
  ngOnDestroy(): void { this.themeObserver?.disconnect(); }
}
