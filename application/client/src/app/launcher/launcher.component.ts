import { Component, OnInit } from '@angular/core';
import { UserService } from '../_services/index';

@Component({
  selector: 'app-producer',
  templateUrl: './launcher.component.html',
  styleUrls: ['./launcher.component.scss']
})
export class LauncherComponent implements OnInit {

  currentUser: any;

  constructor(private user: UserService) { }

  ngOnInit() {
    this.currentUser = this.user.getCurrentUser();
  }

}
