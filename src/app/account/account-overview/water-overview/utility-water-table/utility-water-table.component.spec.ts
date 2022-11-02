import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityWaterTableComponent } from './utility-water-table.component';

describe('UtilityWaterTableComponent', () => {
  let component: UtilityWaterTableComponent;
  let fixture: ComponentFixture<UtilityWaterTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityWaterTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityWaterTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
