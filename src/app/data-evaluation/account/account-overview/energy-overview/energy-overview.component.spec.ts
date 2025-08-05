import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyOverviewComponent } from './energy-overview.component';

describe('EnergyOverviewComponent', () => {
  let component: EnergyOverviewComponent;
  let fixture: ComponentFixture<EnergyOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
