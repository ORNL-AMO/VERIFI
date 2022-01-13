import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupMonthlyEnergyIntensityComponent } from './group-monthly-energy-intensity.component';

describe('GroupMonthlyEnergyIntensityComponent', () => {
  let component: GroupMonthlyEnergyIntensityComponent;
  let fixture: ComponentFixture<GroupMonthlyEnergyIntensityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupMonthlyEnergyIntensityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupMonthlyEnergyIntensityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
