import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUseDonutComponent } from './energy-use-donut.component';

describe('EnergyUseDonutComponent', () => {
  let component: EnergyUseDonutComponent;
  let fixture: ComponentFixture<EnergyUseDonutComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnergyUseDonutComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnergyUseDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
