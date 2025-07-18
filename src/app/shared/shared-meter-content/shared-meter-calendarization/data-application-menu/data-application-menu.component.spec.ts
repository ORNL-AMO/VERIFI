import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataApplicationMenuComponent } from './data-application-menu.component';

describe('DataApplicationMenuComponent', () => {
  let component: DataApplicationMenuComponent;
  let fixture: ComponentFixture<DataApplicationMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataApplicationMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataApplicationMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
