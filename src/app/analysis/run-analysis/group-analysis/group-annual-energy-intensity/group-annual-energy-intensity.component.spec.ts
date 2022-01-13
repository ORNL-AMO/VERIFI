import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnnualEnergyIntensityComponent } from './group-annual-energy-intensity.component';

describe('GroupAnnualEnergyIntensityComponent', () => {
  let component: GroupAnnualEnergyIntensityComponent;
  let fixture: ComponentFixture<GroupAnnualEnergyIntensityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupAnnualEnergyIntensityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupAnnualEnergyIntensityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
