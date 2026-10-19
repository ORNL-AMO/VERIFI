import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { PortfolioDetailLevel, PortfolioTile, PortfolioTileDetailChange, PORTFOLIO_DETAIL_LEVELS } from '../portfolio-inventory.models';

@Component({ selector: 'app-portfolio-inventory', standalone: false,
  templateUrl: './portfolio-inventory.component.html', styleUrls: ['./portfolio-inventory.component.css'] })
export class PortfolioInventoryComponent {
  private readonly tileState = signal<readonly PortfolioTile[]>([]);
  private readonly printState = signal<readonly PortfolioTile[]>([]);
  private readonly detailState = signal<PortfolioDetailLevel>('simple');
  private readonly overrideState = signal<Readonly<Record<string, PortfolioDetailLevel>>>({});
  @Input({ required: true }) set tiles(value: readonly PortfolioTile[]) { this.tileState.set(value); }
  @Input({ required: true }) set printTiles(value: readonly PortfolioTile[]) { this.printState.set(value); }
  @Input() set detail(value: PortfolioDetailLevel) { this.detailState.set(value); }
  @Input() set overrides(value: Readonly<Record<string, PortfolioDetailLevel>>) { this.overrideState.set(value); }
  @Input() page = 0;
  @Input() pages = 1;
  @Input() start = 0;
  @Input() end = 0;
  @Input() total = 0;
  @Output() readonly detailChanged = new EventEmitter<PortfolioTileDetailChange>();
  @Output() readonly pageSelected = new EventEmitter<number>();
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  @Output() readonly layoutReady = new EventEmitter<boolean>();
  readonly level = this.detailState.asReadonly();
  readonly entries = computed(() => this.prepare(this.tileState()));
  readonly uniformRows = computed(() => this.entries().every(entry => !entry.wide));
  readonly printed = computed(() => this.prepare(this.printState()));
  readonly layoutSignature = computed(() => JSON.stringify([this.level(), this.entries().map(item => [item.tile.guid, item.level, item.overridden])]));
  private prepare(tiles: readonly PortfolioTile[]) {
    const overrides = this.overrideState(); const base = this.detailState();
    return tiles.map(tile => {
      const level = overrides[tile.guid] ?? base;
      return { tile, level, overridden: Object.hasOwn(overrides, tile.guid), wide: PORTFOLIO_DETAIL_LEVELS.indexOf(level) > PORTFOLIO_DETAIL_LEVELS.indexOf(base) };
    });
  }
}
