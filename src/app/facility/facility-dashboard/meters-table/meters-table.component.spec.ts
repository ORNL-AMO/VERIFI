import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MetersTableComponent } from './meters-table.component';

describe('MetersTableComponent', () => {
  let component: MetersTableComponent;
  let fixture: ComponentFixture<MetersTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MetersTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MetersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
