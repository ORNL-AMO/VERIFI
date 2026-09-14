import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

@Component({
  template: `
    <app-ui-icon name="search"></app-ui-icon>
    <app-ui-icon name="download" [size]="20" [strokeWidth]="2" [decorative]="false" label="Download data"></app-ui-icon>
    <app-ui-icon name="loading" spin></app-ui-icon>
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

    expect(icons.length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('app-ui-icon.v1-icon').length).toBe(3);
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
});
