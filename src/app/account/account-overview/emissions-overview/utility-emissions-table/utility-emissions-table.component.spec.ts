import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityEmissionsTableComponent } from './utility-emissions-table.component';

describe('UtilityEmissionsTableComponent', () => {
  let component: UtilityEmissionsTableComponent;
  let fixture: ComponentFixture<UtilityEmissionsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityEmissionsTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityEmissionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
