import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService, UserService } from './../../_services/index';
import { MatDialog } from '@angular/material';

@Component({
  selector: 'order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.scss']
})

export class OrderFormComponent implements OnInit {
  messageForm: FormGroup;
  submitted = false;
  success = false;
  order: Object;
  messages: String[];
  currentUser: any;
  producerId: String;
  producers: any[];
  cubesatsizes: any;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private api: ApiService,
    private user: UserService,
    public dialog: MatDialog) { }

  ngOnInit() {
    this.currentUser = this.user.getCurrentUser();

    //this.getProducers();
    this.cubesatsizes = ['1U','2U','3U','6U'];

    this.messageForm = this.formBuilder.group({
      shortName: [''],
      frequencyBand: [''],
      cubesatSize: [''],
      mass: ['']
    });
  }

/*
id: ['', Validators.required],
frequencyBand: ['', Validators.required],
cubesatSize: ['', Validators.required],
mass: ['', Validators.required]
*/

  onSubmit() {
    this.submitted = true;

    if (this.messageForm.invalid) {
      alert("not valid");
      return;
    }

    this.api.body = {
      id: this.messageForm.controls.shortName.value,
      frequencyBand: this.messageForm.controls.frequencyBand.value,
      cubesatSize: this.messageForm.controls.cubesatSize.value,
      mass: this.messageForm.controls.mass.value,
      owner: this.currentUser.userid
    }

    this.api.orderProduct().subscribe(asset => {
      this.order = asset;
      console.log(this.order);
      this.api.queryOrders();
      this.success = true;
    }, error => {
      this.success = false;
      alert("Problem creating Order: " + error['error']['message'])
    })
  }

  // Get the list of registered Producers
  getProducers() {
    this.producers = [];
    this.api.getAllUsers().subscribe(allUsers => {
      var userArray = Object.keys(allUsers).map(function (userIndex) {
        let user = allUsers[userIndex];
        // do something with person
        return user;
      });

      for (let u of userArray) {
        if (u['usertype'] == "producer") {
          this.producers.push(u);
        }
      }
      //console.log("List of Producers: ");
      //console.log(this.producers);
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem getting list of users: " + error['error']['message']);
    });
  }
}

// Generate a random number to create orderId
function uuid() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}`
}
