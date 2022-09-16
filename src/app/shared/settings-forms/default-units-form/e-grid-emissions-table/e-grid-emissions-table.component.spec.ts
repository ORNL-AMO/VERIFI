import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EGridEmissionsTableComponent } from './e-grid-emissions-table.component';

describe('EGridEmissionsTableComponent', () => {
  let component: EGridEmissionsTableComponent;
  let fixture: ComponentFixture<EGridEmissionsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EGridEmissionsTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EGridEmissionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
