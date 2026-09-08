import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { FacilityPickerComponent } from './facility-picker.component';

function facility(guid: string, name: string, city = '', state = ''): IdbFacility {
  return { guid, name, city, state } as IdbFacility;
}

describe('FacilityPickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilityPickerComponent],
      imports: [FormsModule]
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(FacilityPickerComponent);
    return { fixture, component: fixture.componentInstance };
  }

  it('renders a static label when there is a single facility', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.v1-facility-picker__single')?.textContent).toContain('Facility One');
    expect(element.querySelector('.v1-facility-picker__toggle')).toBeNull();
  });

  it('shows a toggle button and hides the search box for five or fewer facilities', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    component.selectedFacility = component.facilities[0];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle');
    expect(toggle?.textContent).toContain('Facility One');

    toggle?.click();
    fixture.detectChanges();

    expect(element.querySelector('.v1-facility-picker__search')).toBeNull();
    expect(element.querySelectorAll('.v1-facility-picker__item').length).toBe(2);
  });

  it('shows a search box once there are more than five facilities and filters the list', () => {
    const { fixture, component } = createComponent();
    const many = Array.from({ length: 5 }, (_, i) => facility(`f${i}`, `Facility ${i}`, 'Knoxville', 'TN'));
    component.facilities = [...many, facility('f5', 'Warehouse', 'Memphis', 'TN')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle')?.click();
    fixture.detectChanges();

    const searchInput = element.querySelector<HTMLInputElement>('.v1-facility-picker__search-input');
    expect(searchInput).not.toBeNull();

    searchInput!.value = 'Warehouse';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const items = element.querySelectorAll('.v1-facility-picker__item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Warehouse');
  });

  it('emits the selected facility guid and closes the menu on selection', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    component.selectedFacility = component.facilities[0];
    fixture.detectChanges();

    let emittedGuid: string | undefined;
    component.facilitySelected.subscribe(guid => (emittedGuid = guid));

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle')?.click();
    fixture.detectChanges();

    const items = element.querySelectorAll<HTMLButtonElement>('.v1-facility-picker__item');
    items[1].click();
    fixture.detectChanges();

    expect(emittedGuid).toBe('f2');
    expect(element.querySelector('.v1-facility-picker__menu')).toBeNull();
  });

  it('closes the menu when the backdrop is clicked', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.v1-facility-picker__menu')).not.toBeNull();

    element.querySelector<HTMLElement>('.v1-facility-picker__backdrop')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.v1-facility-picker__menu')).toBeNull();
  });

  it('closes the menu and returns focus to the toggle button on Escape', () => {
    const { fixture, component } = createComponent();
    component.facilities = [facility('f1', 'Facility One'), facility('f2', 'Facility Two')];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle');
    toggle?.click();
    fixture.detectChanges();
    expect(element.querySelector('.v1-facility-picker__menu')).not.toBeNull();

    element.querySelector<HTMLElement>('.v1-facility-picker')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    fixture.detectChanges();

    expect(element.querySelector('.v1-facility-picker__menu')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});
