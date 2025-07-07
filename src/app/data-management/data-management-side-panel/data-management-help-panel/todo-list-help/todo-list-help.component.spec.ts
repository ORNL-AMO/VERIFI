import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoListHelpComponent } from './todo-list-help.component';

describe('TodoListHelpComponent', () => {
  let component: TodoListHelpComponent;
  let fixture: ComponentFixture<TodoListHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TodoListHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodoListHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
