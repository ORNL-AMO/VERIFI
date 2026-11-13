import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Apple01Icon from '@hugeicons/core-free-icons/Apple01Icon';
import LayoutTable01Icon from '@hugeicons/core-free-icons/LayoutTable01Icon';
import MicroscopeIcon from '@hugeicons/core-free-icons/MicroscopeIcon';
import OrangeIcon from '@hugeicons/core-free-icons/OrangeIcon';
import SaveIcon from '@hugeicons/core-free-icons/SaveIcon';
import Upload03Icon from '@hugeicons/core-free-icons/Upload03Icon';
import { IconComponent } from './icon.component';
import { ICON_REGISTRY } from './icon-registry';
import { readFileSync } from 'fs';
import { join } from 'path';

@Component({
  template: `
    <app-ui-icon name="search"></app-ui-icon>
    <app-ui-icon name="download" [size]="20" [strokeWidth]="2" [decorative]="false" label="Download data"></app-ui-icon>
    <app-ui-icon name="loading" spin></app-ui-icon>
    <app-ui-icon name="uploadData"></app-ui-icon>
    <app-ui-icon name="dataVisualization" [size]="24" [strokeWidth]="2" [decorative]="false" label="Visualization"></app-ui-icon>
    <app-ui-icon name="betterPlantsReport" [size]="16" [decorative]="false" label="Better Plants report"></app-ui-icon>
    <app-ui-icon name="facilityAnalysisReport" [size]="24" [decorative]="false" label="Facility analysis report"></app-ui-icon>
    <app-ui-icon name="facilityAnalysisReport" [size]="20" [strokeWidth]="2" [decorative]="false" label="Facility analysis report override"></app-ui-icon>
    <app-ui-icon name="pump" [size]="16" [decorative]="false" label="Pump"></app-ui-icon>
    <app-ui-icon name="fan" [size]="24" [decorative]="false" label="Fan"></app-ui-icon>
    <app-ui-icon name="fan" [size]="32" [strokeWidth]="2" [decorative]="false" label="Fan override"></app-ui-icon>
    <app-ui-icon name="processHeating" [size]="16" [decorative]="false" label="Process heating"></app-ui-icon>
    <app-ui-icon name="processCooling" [size]="24" [decorative]="false" label="Process cooling"></app-ui-icon>
    <app-ui-icon name="processCooling" [size]="32" [strokeWidth]="2" [decorative]="false" label="Process cooling override"></app-ui-icon>
    <app-ui-icon name="steam" [size]="24" [decorative]="false" label="Steam"></app-ui-icon>
    <app-ui-icon name="steam" [size]="16" [strokeWidth]="2" [decorative]="false" label="Steam override"></app-ui-icon>
    <app-ui-icon name="compressedAir" [size]="24" [decorative]="false" label="Compressed air"></app-ui-icon>
    <app-ui-icon name="compressedAir" [size]="16" [strokeWidth]="2" [decorative]="false" label="Compressed air override"></app-ui-icon>
    <app-ui-icon name="energyUseGroup" [size]="24" [decorative]="false" label="Energy-use group"></app-ui-icon>
    <app-ui-icon name="energyUseGroup" [size]="16" [strokeWidth]="2" [decorative]="false" label="Energy-use group override"></app-ui-icon>
    <app-ui-icon name="motor" [size]="24" [decorative]="false" label="Motor"></app-ui-icon>
    <app-ui-icon name="motor" [size]="16" [strokeWidth]="2" [decorative]="false" label="Motor override"></app-ui-icon>
    <app-ui-icon name="groupEnergyFootprint" [size]="24" [decorative]="false" label="Group energy footprint"></app-ui-icon>
    <app-ui-icon name="groupEnergyFootprint" [size]="16" [strokeWidth]="2" [decorative]="false" label="Group energy footprint override"></app-ui-icon>
    <app-ui-icon name="facilityEnergyFootprint" [size]="24" [decorative]="false" label="Facility energy footprint"></app-ui-icon>
    <app-ui-icon name="facilityEnergyFootprint" [size]="16" [strokeWidth]="2" [decorative]="false" label="Facility energy footprint override"></app-ui-icon>
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

    expect(icons.length).toBe(26);
    expect(fixture.nativeElement.querySelectorAll('app-ui-icon.v1-icon').length).toBe(26);
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

  it('retains the default stroke width for Hugeicons', () => {
    expect(fixture.nativeElement.querySelector('app-ui-icon path').getAttribute('stroke-width')).toBe('1.75');
  });

  it.each([
    { file: 'verifi-chart.svg', index: 4, label: 'Visualization', size: '24', stroke: '2' },
    { file: 'better-plants-report.svg', index: 5, label: 'Better Plants report', size: '16', stroke: '1.75' },
    { file: 'facility-analysis-report.svg', index: 6, label: 'Facility analysis report', size: '24', stroke: undefined },
    { file: 'facility-analysis-report.svg', index: 7, label: 'Facility analysis report override', size: '20', stroke: '2' },
    { file: 'pump.svg', index: 8, label: 'Pump', size: '16', stroke: undefined },
    { file: 'fan.svg', index: 9, label: 'Fan', size: '24', stroke: undefined },
    { file: 'fan.svg', index: 10, label: 'Fan override', size: '32', stroke: '2' },
    { file: 'process-heating.svg', index: 11, label: 'Process heating', size: '16', stroke: undefined },
    { file: 'process-cooling.svg', index: 12, label: 'Process cooling', size: '24', stroke: undefined },
    { file: 'process-cooling.svg', index: 13, label: 'Process cooling override', size: '32', stroke: '2' },
    { file: 'steam.svg', index: 14, label: 'Steam', size: '24', stroke: undefined },
    { file: 'steam.svg', index: 15, label: 'Steam override', size: '16', stroke: '2' },
    { file: 'compressed-air.svg', index: 16, label: 'Compressed air', size: '24', stroke: undefined },
    { file: 'compressed-air.svg', index: 17, label: 'Compressed air override', size: '16', stroke: '2' },
    { file: 'energy-use-group.svg', index: 18, label: 'Energy-use group', size: '24', stroke: undefined },
    { file: 'energy-use-group.svg', index: 19, label: 'Energy-use group override', size: '16', stroke: '2' },
    { file: 'motor.svg', index: 20, label: 'Motor', size: '24', stroke: undefined },
    { file: 'motor.svg', index: 21, label: 'Motor override', size: '16', stroke: '2' },
    { file: 'group-energy-footprint.svg', index: 22, label: 'Group energy footprint', size: '24', stroke: undefined },
    { file: 'group-energy-footprint.svg', index: 23, label: 'Group energy footprint override', size: '16', stroke: '2' },
    { file: 'facility-energy-footprint.svg', index: 24, label: 'Facility energy footprint', size: '24', stroke: undefined },
    { file: 'facility-energy-footprint.svg', index: 25, label: 'Facility energy footprint override', size: '16', stroke: '2' }
  ])('renders $file through the same themed, accessible icon API', ({ file, index, label, size, stroke }) => {
    const source = readFileSync(join(process.cwd(), 'src/assets/icons', file), 'utf8');
    const document = new DOMParser().parseFromString(source, 'image/svg+xml');
    const original = [...document.querySelectorAll('path')].map(path => path.getAttribute('d'));
    const host: HTMLElement = fixture.nativeElement.querySelectorAll('app-ui-icon')[index];
    expect([...host.querySelectorAll('path')].map(path => path.getAttribute('d'))).toEqual(original);
    expect(host.getAttribute('aria-label')).toBe(label);
    expect(host.getAttribute('role')).toBe('img');
    expect(host.querySelector('svg')?.getAttribute('width')).toBe(size);
    expect(host.querySelector('path')?.getAttribute('stroke')).toBe('currentColor');
    const sourcePaths = [...document.querySelectorAll('path')];
    expect([...host.querySelectorAll('path')].map(path => path.getAttribute('stroke-width')))
      .toEqual(sourcePaths.map(path => stroke ?? path.getAttribute('stroke-width') ?? document.documentElement.getAttribute('stroke-width')));
    expect(host.querySelector('path')?.getAttribute('stroke-linecap')).toBe('round');
    const sourceShapes = [...document.querySelectorAll('circle, rect, ellipse')];
    const renderedShapes = [...host.querySelectorAll('circle, rect, ellipse')];
    const geometryAttributes = ['cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'ry'];
    expect(renderedShapes.map(shape => [shape.tagName, ...geometryAttributes.map(attribute => shape.getAttribute(attribute))]))
      .toEqual(sourceShapes.map(shape => [shape.tagName, ...geometryAttributes.map(attribute => shape.getAttribute(attribute))]));
    expect(renderedShapes.map(shape => shape.getAttribute('stroke-width')))
      .toEqual(sourceShapes.map(shape => stroke ?? shape.getAttribute('stroke-width') ?? document.documentElement.getAttribute('stroke-width')));
    for (const shape of renderedShapes) {
      expect(shape.getAttribute('stroke')).toBe('currentColor');
      expect(shape.getAttribute('fill')).toBe('none');
    }
  });

  it('maps the spreadsheet columns icon to LayoutTable01Icon', () => {
    expect(ICON_REGISTRY.spreadsheetColumns).toBe(LayoutTable01Icon);
  });

  it('maps the save icon to SaveIcon', () => {
    expect(ICON_REGISTRY.save).toBe(SaveIcon);
  });

  it('maps the analysis icon to MicroscopeIcon', () => {
    expect(ICON_REGISTRY.analysis).toBe(MicroscopeIcon);
  });

  it('maps the comparison fruit icons to their Hugeicons', () => {
    expect(ICON_REGISTRY.apple).toBe(Apple01Icon);
    expect(ICON_REGISTRY.orange).toBe(OrangeIcon);
  });
});
