import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../_services/index';

@Component({
  selector: 'app-payloadowner',
  templateUrl: './payloadowner.component.html',
  styleUrls: ['./payloadowner.component.scss'],
  providers: [ ]
})

export class PayloadownerComponent implements OnInit {

  currentUser: any;

  constructor(private user: UserService) { }

  ngOnInit() {
    this.currentUser = this.user.getCurrentUser();
  }
}
