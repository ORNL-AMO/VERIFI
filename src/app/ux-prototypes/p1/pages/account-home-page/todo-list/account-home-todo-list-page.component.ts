import { Component, computed, inject } from '@angular/core';
import { P1SetupTask } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

interface P1SetupTaskGroup {
  title: string;
  tasks: Array<P1SetupTask>;
}

@Component({
  selector: 'app-p1-account-home-todo-list-page',
  templateUrl: './account-home-todo-list-page.component.html',
  styleUrls: [
    '../../../components/workspace-main/workspace-main.component.css',
    '../account-home-page.component.css'
  ],
  standalone: false
})
export class P1AccountHomeTodoListPageComponent {
  readonly facade = inject(P1RouteFacade);
  readonly taskGroups = computed<Array<P1SetupTaskGroup>>(() => this.groupTasks(this.facade.setup().allTasks));

  private groupTasks(tasks: Array<P1SetupTask>): Array<P1SetupTaskGroup> {
    const groups = new Map<string, Array<P1SetupTask>>();
    tasks.forEach(task => {
      groups.set(task.group, [...(groups.get(task.group) || []), task]);
    });
    return Array.from(groups.entries()).map(([title, groupTasks]) => ({ title, tasks: groupTasks }));
  }
}
