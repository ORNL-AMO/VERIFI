import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { Router } from '@angular/router';
import { PORTFOLIO_DETAIL_LEVELS, PortfolioDetailLevel, PortfolioTile, PortfolioTileDetailChange } from '../portfolio-inventory.models';

@Component({ selector: 'app-portfolio-tile', standalone: false,
  templateUrl: './portfolio-tile.component.html', styleUrls: ['./portfolio-tile.component.css'] })
export class PortfolioTileComponent {
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @Input({ required: true }) tile!: PortfolioTile;
  @Input() level: PortfolioDetailLevel = 'simple';
  @Input() overridden = false;
  @Input() print = false;
  @Output() readonly detailChanged = new EventEmitter<PortfolioTileDetailChange>();
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  @ViewChild(CdkMenuTrigger) private trigger?: CdkMenuTrigger;
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  readonly levels = PORTFOLIO_DETAIL_LEVELS;
  readonly menuClasses = signal('v1-root portfolio-tile-menu');
  private themeObserver?: MutationObserver;
  mainHref = '';
  ownerHref = '';
  groupHref = '';
  stationHref = '';
  detailHref = '';
  locationLabel = '';
  chipLabel = '';
  stationLabel = '';
  ngOnChanges(): void {
    const href = (route: readonly string[]) => this.router.serializeUrl(this.router.createUrlTree([...route]));
    this.mainHref = href(this.tile.route);
    this.ownerHref = this.tile.owner ? href(this.tile.owner.route) : '';
    this.stationHref = this.tile.stationLink ? href(this.tile.stationLink.route) : '';
    this.groupHref = this.tile.meterSnapshot?.group.route ? href(this.tile.meterSnapshot.group.route) : '';
    this.detailHref = this.tile.detailLink ? href(this.tile.detailLink.route) : '';
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
    queueMicrotask(() => document.getElementById(`portfolio-detail-${this.tile.guid}`)?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus());
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
  choose(level: PortfolioDetailLevel | null): void {
    this.detailChanged.emit({ guid: this.tile.guid, level });
    this.trigger?.close(); this.menuButton?.nativeElement.focus();
  }
  ngOnDestroy(): void { this.themeObserver?.disconnect(); }
}
