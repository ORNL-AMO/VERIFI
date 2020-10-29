import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherEnergyComponent } from './other-energy.component';

describe('OtherEnergyComponent', () => {
  let component: OtherEnergyComponent;
  let fixture: ComponentFixture<OtherEnergyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OtherEnergyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OtherEnergyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
