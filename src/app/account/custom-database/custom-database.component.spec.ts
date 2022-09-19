import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDatabaseComponent } from './custom-database.component';

describe('CustomDatabaseComponent', () => {
  let component: CustomDatabaseComponent;
  let fixture: ComponentFixture<CustomDatabaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomDatabaseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDatabaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
