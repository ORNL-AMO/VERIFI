import { InventoryTileComponent } from '../inventory-tile/inventory-tile.component';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { InventoryDetailLevel, InventoryTile, InventoryTileDetailChange, InventoryTileMenuAction, InventoryTileActionRequest, INVENTORY_DETAIL_LEVELS } from '../inventory.models';

@Component({ selector: 'app-inventory-grid', standalone: true, imports: [InventoryTileComponent],
  templateUrl: './inventory-grid.component.html', styleUrls: ['./inventory-grid.component.css'] })
export class InventoryGridComponent {
  private readonly tileState = signal<readonly InventoryTile[]>([]);
  private readonly printState = signal<readonly InventoryTile[]>([]);
  private readonly detailState = signal<InventoryDetailLevel>('simple');
  private readonly overrideState = signal<Readonly<Record<string, InventoryDetailLevel>>>({});
  @Input({ required: true }) set tiles(value: readonly InventoryTile[]) { this.tileState.set(value); }
  @Input({ required: true }) set printTiles(value: readonly InventoryTile[]) { this.printState.set(value); }
  @Input() set detail(value: InventoryDetailLevel) { this.detailState.set(value); }
  @Input() set overrides(value: Readonly<Record<string, InventoryDetailLevel>>) { this.overrideState.set(value); }
  @Input() actionsByGuid: Readonly<Record<string, readonly InventoryTileMenuAction[]>> = {};
  @Input() actions: readonly InventoryTileMenuAction[] = [];
  @Input() selecting = false;
  @Input() selected: readonly string[] = [];
  @Input() canSelect = true;
  @Input() canSelectByGuid: Readonly<Record<string, boolean>> = {};
  @Output() readonly actionRequested = new EventEmitter<InventoryTileActionRequest>();
  @Output() readonly selectionChanged = new EventEmitter<{ guid: string; selected: boolean }>();
  @Input() page = 0;
  @Input() pages = 1;
  @Input() start = 0;
  @Input() end = 0;
  @Input() total = 0;
  @Output() readonly detailChanged = new EventEmitter<InventoryTileDetailChange>();
  @Output() readonly pageSelected = new EventEmitter<number>();
  @Output() readonly navigationRequested = new EventEmitter<readonly string[]>();
  readonly level = this.detailState.asReadonly();
  readonly entries = computed(() => this.prepare(this.tileState()));
  readonly printed = computed(() => this.prepare(this.printState()));
  private prepare(tiles: readonly InventoryTile[]) {
    const overrides = this.overrideState(); const base = this.detailState();
    return tiles.map(tile => {
      const level = overrides[tile.guid] ?? base;
      return { tile, level, wide: INVENTORY_DETAIL_LEVELS.indexOf(level) > INVENTORY_DETAIL_LEVELS.indexOf(base) };
    });
  }
}
