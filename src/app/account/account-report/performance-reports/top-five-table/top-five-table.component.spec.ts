import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopFiveTableComponent } from './top-five-table.component';

describe('TopFiveTableComponent', () => {
  let component: TopFiveTableComponent;
  let fixture: ComponentFixture<TopFiveTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TopFiveTableComponent]
    });
    fixture = TestBed.createComponent(TopFiveTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
