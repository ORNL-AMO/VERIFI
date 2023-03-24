import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetersHelpComponent } from './meters-help.component';

describe('MetersHelpComponent', () => {
  let component: MetersHelpComponent;
  let fixture: ComponentFixture<MetersHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MetersHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetersHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
