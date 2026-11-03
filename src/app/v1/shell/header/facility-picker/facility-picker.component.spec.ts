import { OverlayModule } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityPickerComponent } from './facility-picker.component';
import { FacilityPickerTestModule } from './facility-picker.testing';

function facility(guid: string, name: string, city = '', state = ''): IdbFacility {
  return { guid, name, city, state } as IdbFacility;
}

describe('FacilityPickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FacilityPickerTestModule, OverlayModule, ReactiveFormsModule, IconComponent]
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(FacilityPickerComponent);
    return { fixture, component: fixture.componentInstance };
  }

  it('keeps All facilities available during search and emits a typed all scope for a one-facility portfolio', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Only facility')];
    component.selectedFacility = component.facilities[0];
    const select = vi.fn(); component.facilitySelected.subscribe(select);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.v1-facility-picker__toggle').click(); fixture.detectChanges();
    component.search.setValue('no match'); fixture.detectChanges();
    expect(document.querySelector('.v1-facility-picker__empty')?.textContent).toContain('No facilities match');
    document.querySelector<HTMLButtonElement>('.v1-facility-picker__all')!.click();
    expect(select).toHaveBeenCalledWith({ kind: 'all' });
  });

  it('retains workspace order without a preference and disables selection when there are no facilities', () => {
    const { fixture, component } = createComponent(); fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    component.facilities = [facility('z', 'Zebra'), facility('a', 'Alpha')]; fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click(); fixture.detectChanges();
    expect([...document.querySelectorAll('.v1-facility-picker__list button')].map(item => item.textContent?.trim())).toEqual(['Zebra', 'Alpha']);
  });

  it('moves from the search field to the last facility with ArrowUp', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'First'), facility('f2', 'Second'), facility('f3', 'Last')];
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.v1-facility-picker__toggle').click();
    fixture.detectChanges();
    const search = document.querySelector<HTMLInputElement>('.v1-facility-picker__search-input')!;
    search.focus(); search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('Last');
  });

  it('keeps All facilities and a chooser for portfolios with one facility', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One')]; fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click(); fixture.detectChanges();
    expect(document.querySelector('.v1-facility-picker__menu')?.textContent).toContain('All facilities');
    expect(document.querySelector('.v1-facility-picker__menu')?.textContent).toContain('Facility One');
  });

  it('shows a searchable toggle even for a small facility inventory', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    component.selectedFacility = component.facilities[0];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle');
    expect(toggle?.textContent).toContain('Facility One');

    toggle?.click();
    fixture.detectChanges();

    expect(document.querySelector('.v1-facility-picker__search')).not.toBeNull();
    expect(document.querySelectorAll('.v1-facility-picker__item').length).toBe(3);
  });

  it('shows a search box once there are more than five facilities and filters the list', () => {
    const { fixture, component } = createComponent();
    const many = Array.from({ length: 5 }, (_, i) => facility(`f${i}`, `Facility ${i}`, 'Knoxville', 'TN'));
    component.facilities = [...many, facility('f5', 'Warehouse', 'Memphis', 'TN')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle')?.click();
    fixture.detectChanges();

    const searchInput = document.querySelector<HTMLInputElement>('.v1-facility-picker__search-input');
    expect(searchInput).not.toBeNull();

    searchInput!.value = 'Warehouse';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const items = document.querySelectorAll('.v1-facility-picker__item');
    expect(items.length).toBe(2);
    expect(items[1].textContent).toContain('Warehouse');
  });

  it('emits the selected facility guid and closes the menu on selection', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    component.selectedFacility = component.facilities[0];
    fixture.detectChanges();

    let emittedGuid: import('@app/v1/routing/workspace-route').FacilityScope | undefined;
    component.facilitySelected.subscribe(guid => (emittedGuid = guid));

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle')?.click();
    fixture.detectChanges();

    const items = document.querySelectorAll<HTMLButtonElement>('.v1-facility-picker__item');
    items[2].click();
    fixture.detectChanges();

    expect(emittedGuid).toEqual({ kind: 'facility', facilityGuid: 'f2' });
    expect(document.querySelector('.v1-facility-picker__menu')).toBeNull();
  });

  it('closes the menu when the backdrop is clicked', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle')?.click();
    fixture.detectChanges();
    expect(document.querySelector('.v1-facility-picker__menu')).not.toBeNull();

    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    fixture.detectChanges();

    expect(document.querySelector('.v1-facility-picker__menu')).toBeNull();
  });

  it('closes the menu and returns focus to the toggle button on Escape', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle');
    toggle?.click();
    fixture.detectChanges();
    expect(document.querySelector('.v1-facility-picker__menu')).not.toBeNull();

    element.querySelector<HTMLElement>('.v1-facility-picker')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    fixture.detectChanges();

    expect(document.querySelector('.v1-facility-picker__menu')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('searches normalized location text and clears the filter when reopened', () => {
    const { fixture, component } = createComponent();
    component.facilities = Array.from({ length: 6 }, (_, index) =>
      facility(`f${index}`, `Facility ${index}`, index === 5 ? 'Memphis' : 'Knoxville', 'TN'));
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-facility-picker__toggle');
    toggle.click();
    fixture.detectChanges();
    const input: HTMLInputElement = document.querySelector('.v1-facility-picker__menu input');
    input.value = '  MEMPHIS  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(document.querySelectorAll('.v1-facility-picker__item')).toHaveLength(2);
    expect(document.querySelector('.v1-facility-picker__list .v1-facility-picker__item')?.textContent).toContain('Memphis');
    toggle.click();
    toggle.click();
    fixture.detectChanges();
    expect(document.querySelector<HTMLInputElement>('.v1-facility-picker__menu input')!.value).toBe('');
    expect(document.querySelectorAll('.v1-facility-picker__item')).toHaveLength(7);
  });
});
