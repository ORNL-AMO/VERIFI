import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionalEmissionsDataComponent } from './regional-emissions-data.component';

describe('RegionalEmissionsDataComponent', () => {
  let component: RegionalEmissionsDataComponent;
  let fixture: ComponentFixture<RegionalEmissionsDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegionalEmissionsDataComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionalEmissionsDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
