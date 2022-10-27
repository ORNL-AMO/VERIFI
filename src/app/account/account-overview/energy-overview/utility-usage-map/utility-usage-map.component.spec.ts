import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityUsageMapComponent } from './utility-usage-map.component';

describe('UtilityUsageMapComponent', () => {
  let component: UtilityUsageMapComponent;
  let fixture: ComponentFixture<UtilityUsageMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityUsageMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityUsageMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
