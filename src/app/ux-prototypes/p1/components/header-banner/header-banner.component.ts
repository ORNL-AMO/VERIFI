import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../p1-route.facade';
import { P1CornerStyle, P1Density, P1Palette } from '../../p1.models';

interface P1PaletteOption {
  id: P1Palette;
  label: string;
  swatchClass: string;
}

interface P1SegmentOption<T> {
  id: T;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-p1-header-banner',
  templateUrl: './header-banner.component.html',
  styleUrls: ['./header-banner.component.css'],
  standalone: false
})
export class P1HeaderBannerComponent {
  readonly facade = inject(P1RouteFacade);

  readonly paletteOptions: Array<P1PaletteOption> = [
    { id: 'default', label: 'Default', swatchClass: 'p1-header__swatch--default' },
    { id: 'ocean', label: 'Ocean', swatchClass: 'p1-header__swatch--ocean' },
    { id: 'forest', label: 'Forest', swatchClass: 'p1-header__swatch--forest' },
    { id: 'sunset', label: 'Sunset', swatchClass: 'p1-header__swatch--sunset' },
    { id: 'neon', label: 'Neon Grid', swatchClass: 'p1-header__swatch--neon' },
    { id: 'blueprint', label: 'Blueprint', swatchClass: 'p1-header__swatch--blueprint' },
    { id: 'steel', label: 'Steel Lab', swatchClass: 'p1-header__swatch--steel' },
    { id: 'aurora', label: 'Aurora', swatchClass: 'p1-header__swatch--aurora' }
  ];

  readonly densityOptions: Array<P1SegmentOption<P1Density>> = [
    { id: 'comfortable', label: 'Comfort', icon: 'fa-grip' },
    { id: 'compact', label: 'Compact', icon: 'fa-table-cells' }
  ];

  readonly cornerOptions: Array<P1SegmentOption<P1CornerStyle>> = [
    { id: 'soft', label: 'Soft', icon: 'fa-square' },
    { id: 'square', label: 'Square', icon: 'fa-vector-square' }
  ];

  accountMenuOpen = false;
  facilityMenuOpen = false;
  appMenuOpen = false;

  facilitySearch = '';

  get filteredFacilities() {
    const q = this.facilitySearch.trim().toLowerCase();
    const all = this.facade.accountFacilities();
    return q ? all.filter(f => f.name.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q)) : all;
  }

  get showFacilitySearch(): boolean {
    return this.facade.accountFacilities().length > 5;
  }

  get hasBackdrop(): boolean {
    return this.accountMenuOpen || this.facilityMenuOpen || this.appMenuOpen;
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen = !this.accountMenuOpen;
    this.facilityMenuOpen = false;
    this.appMenuOpen = false;
  }

  toggleFacilityMenu(): void {
    this.facilityMenuOpen = !this.facilityMenuOpen;
    if (this.facilityMenuOpen) {
      this.facilitySearch = '';
    }
    this.accountMenuOpen = false;
    this.appMenuOpen = false;
  }

  toggleAppMenu(): void {
    this.appMenuOpen = !this.appMenuOpen;
    this.accountMenuOpen = false;
    this.facilityMenuOpen = false;
  }

  closeAll(): void {
    this.accountMenuOpen = false;
    this.facilityMenuOpen = false;
    this.appMenuOpen = false;
  }

  selectAccount(id: string): void {
    void this.facade.switchAccount(id);
    this.closeAll();
  }

  selectFacility(id: string): void {
    this.facade.setFacility(id);
    this.closeAll();
  }

  switchToAccountContext(): void {
    this.facade.setContext('account');
    this.closeAll();
  }

  switchToSingleFacility(): void {
    const facility = this.facade.accountFacilities()[0];
    if (facility) {
      this.facade.setFacility(facility.id);
    }
    this.closeAll();
  }
}
