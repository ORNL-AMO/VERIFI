import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostsMapComponent } from './facility-costs-map.component';

describe('FacilityCostsMapComponent', () => {
  let component: FacilityCostsMapComponent;
  let fixture: ComponentFixture<FacilityCostsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityCostsMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
