import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityEnergyUseTableComponent } from './utility-energy-use-table.component';

describe('UtilityEnergyUseTableComponent', () => {
  let component: UtilityEnergyUseTableComponent;
  let fixture: ComponentFixture<UtilityEnergyUseTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UtilityEnergyUseTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityEnergyUseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
