import { Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Avatar } from 'primeng/avatar';
import { Tooltip } from 'primeng/tooltip';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-list',
  imports: [TableModule, Avatar, Button, Tooltip, Tag],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {

  tickets = input<any[]>([]);

  getSeverityPriority(status: string) {
    switch (status) {
      case 'Low':
        return 'success';
      case 'Medium':
        return 'warn';
      case 'High':
        return 'danger';
      default:
        return 'info';
    }
  }

  getSeverityType(status: string) {
    switch (status) {
      case 'Feature':
        return 'info';
      case 'Bug':
        return 'danger';
      default:
        return 'warn';
    }
  }
}
