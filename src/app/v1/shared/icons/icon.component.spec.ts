import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import LayoutTable01Icon from '@hugeicons/core-free-icons/LayoutTable01Icon';
import Upload03Icon from '@hugeicons/core-free-icons/Upload03Icon';
import { IconComponent } from './icon.component';
import { ICON_REGISTRY } from './icon-registry';

@Component({
  template: `
    <app-ui-icon name="search"></app-ui-icon>
    <app-ui-icon name="download" [size]="20" [strokeWidth]="2" [decorative]="false" label="Download data"></app-ui-icon>
    <app-ui-icon name="loading" spin></app-ui-icon>
    <app-ui-icon name="uploadData"></app-ui-icon>
  `,
  imports: [IconComponent],
  standalone: true
})
class IconHostComponent { }

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
  });

  it('renders Hugeicons icons with the v1 icon host class', () => {
    const icons = fixture.nativeElement.querySelectorAll('app-ui-icon hugeicons-icon');

    expect(icons.length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('app-ui-icon.v1-icon').length).toBe(4);
  });

  it('keeps decorative icons hidden from assistive technology by default', () => {
    const icon: HTMLElement = fixture.nativeElement.querySelector('app-ui-icon');

    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('role')).toBeNull();
    expect(icon.getAttribute('aria-label')).toBeNull();
  });

  it('supports labeled meaningful icons', () => {
    const icon: HTMLElement = fixture.nativeElement.querySelectorAll('app-ui-icon')[1];

    expect(icon.getAttribute('role')).toBe('img');
    expect(icon.getAttribute('aria-label')).toBe('Download data');
    expect(icon.getAttribute('aria-hidden')).toBeNull();
  });

  it('applies spin only to loading-style icons that request it', () => {
    const icons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('app-ui-icon');

    expect(icons[0].classList.contains('v1-icon--spin')).toBe(false);
    expect(icons[2].classList.contains('v1-icon--spin')).toBe(true);
  });

  it('maps the spreadsheet upload icon to Upload03Icon', () => {
    expect(ICON_REGISTRY.uploadData).toBe(Upload03Icon);
  });

  it('maps the spreadsheet columns icon to LayoutTable01Icon', () => {
    expect(ICON_REGISTRY.spreadsheetColumns).toBe(LayoutTable01Icon);
  });
});
