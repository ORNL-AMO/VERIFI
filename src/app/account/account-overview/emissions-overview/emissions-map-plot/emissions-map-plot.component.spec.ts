import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsMapPlotComponent } from './emissions-map-plot.component';

describe('EmissionsMapPlotComponent', () => {
  let component: EmissionsMapPlotComponent;
  let fixture: ComponentFixture<EmissionsMapPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsMapPlotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsMapPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
