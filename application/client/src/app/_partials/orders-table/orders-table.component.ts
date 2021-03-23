import { Component, Inject, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ApiService, UserService } from '../../_services/index';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, TooltipPosition } from '@angular/material';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'orders-table',
  templateUrl: './orders-table.component.html',
  styleUrls: ['./orders-table.component.scss'],
  providers: [],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})

export class OrdersTableComponent implements OnInit {
  orders: MatTableDataSource<Order[]>;
  currentUser: any;
  columnsToDisplay = ['id', 'cubesatSize', 'frequencyBand', 'mass', 'owner', 'launcher', 'status'];
  expandedElement: Order | null;

  @Input('regulator') regulator: boolean;

  constructor(private api: ApiService, private user: UserService, private cd: ChangeDetectorRef, public dialog: MatDialog) { }

  ngOnInit() {
    this.currentUser = this.user.getCurrentUser();
    //console.log("currentUser: "+this.currentUser);
    this.regulator = this.regulator !== undefined;
    //console.log(`Regulator Boolean attribute is ${this.regulator ? '' : 'non-'}present!`);

    // Load up the Assets from backend
    this.api.orders$.subscribe(currentOrders => {
      this.orders = new MatTableDataSource(currentOrders);
      this.cd.markForCheck();
    })
    this.api.queryOrders();
    //this.createAsset('1');
  }

  applyFilter(filterValue: string) {
    this.orders.filter = filterValue.trim().toLowerCase();
  }

/*    // payloadowner
    createAsset(assetid) {
      this.api.body = {
        id: "1234",
        owner: 'user1',
        frequencyBand: '2GHz',
        cubesatSize: '2U',
        mass: '2kg'
      };

      this.api.id = '1234';
      this.api.createAsset().subscribe(api => {
        this.api.queryOrders();
      }, error => {
        console.log(JSON.stringify(error));
        alert("Problem creating payload asset: " + error['error']['message'])
      });
    }
*/
  // SATELLITE_LAUNCHER calls
  assignSlot(assetid) {
    this.api.id = assetid;
    this.api.assignSlot().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem accepting order: " + error['error']['message'])
    });
  }

  // payloadowner calls
  shipPayload(assetid) {
    this.api.id = assetid;
    this.api.shipPayload().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem creating payload asset: " + error['error']['message'])
    });
  }

  //  Satellite launcher calls
  shipmentReceived(assetid) {
    console.log ('Shipment received: assetid =  ' +  assetid);
    this.api.id = assetid;
    this.api.ShipmentReceived().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem accepting order: " + error['error']['message'])
    });
  }

  //  Satellite launcher calls
  clearForFlight(assetid) {
    console.log ('Cleared for Flight, Yay: assetid =  ' +  assetid);
    this.api.id = assetid;
    this.api.clearForFlight().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem accepting order: " + error['error']['message'])
    });
  }

  //  Satellite launcher calls
  verifyPayload(assetid) {
    console.log ('verifypayload: assetid =  ' +  assetid);
    this.api.id = assetid;
    this.api.verifyPayload().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem accepting order: " + error['error']['message'])
    });
  }

/*
  // create dialog with shipper select menu
  chooseShipper(orderid) {
    let shippers = [];
    this.api.getAllUsers().subscribe(allUsers => {
      //console.log(allUsers);
      var userArray = Object.keys(allUsers).map(function (userIndex) {
        let user = allUsers[userIndex];
        // do something with person
        return user;
      });

      for (let u of userArray) {
        if (u['usertype'] == "shipper") {
          shippers.push(u);
        }
      }
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem choosing shipper: " + error['error']['message'])
    });

    // Open ToShipper Dialog
    const dialogRef = this.dialog.open(ToShipperDialog, {
      disableClose: false,
      width: '600px',
      data: { shippers: shippers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.assignShipper(orderid, result['id']);
      }
    });
  }

  // producer
  assignShipper(orderid, shipperid) {
    this.api.id = orderid;
    this.api.shipperid = shipperid;
    this.api.assignShipper().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem assigning shipper: " + error['error']['message'])
    });
  }

  // shipper
  createShipment(orderid) {
    this.api.id = orderid;
    this.api.createShipment().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem creating shipment: " + error['error']['message'])
    });
  }

  // shipper
  transportShipment(orderid) {
    this.api.id = orderid;
    this.api.transportShipment().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem transporting shipment: " + error['error']['message'])
    });
  }

  // retailer
  receiveShipment(orderid) {
    this.api.id = orderid;
    this.api.receiveShipment().subscribe(api => {
      this.api.queryOrders();
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem receiving shipment: " + error['error']['message'])
    })
  }
*/
  // delete order
  deleteAsset(order) {
    // Open Tile Dialog
    const dialogRef = this.dialog.open(DeleteOrderDialog, {
      disableClose: false,
      width: '600px',
      data: { order: order }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {
        this.api.id = order.id;
        this.api.deleteAsset().subscribe(res => {
          console.log(res);
          this.api.queryOrders();
        }, error => {
          console.log(JSON.stringify(error));
          alert("Problem deleting order: " + error['error']['message'])
        });
      }
    });
  }
}

export interface Order {
  orderId: string;
  productId: string;
  price: number;
  quantity: number;
  producerId: string;
  retailerId: string;
  currentAssetState: number;
  trackingInfo: string;
}

export interface ShipperDialogData {
  shippers: [];
}

@Component({
  selector: 'to-shipper-dialog',
  templateUrl: './../dialogs/to-shipper-dialog.html',
  styleUrls: ['./orders-table.component.scss'],
})

export class ToShipperDialog implements OnInit {
  model: any;
  constructor(
    public dialogRef: MatDialogRef<ToShipperDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ShipperDialogData) { }

  ngOnInit() {
    this.model = {};
  }
}

export interface DeleteDialogData {
  order: {};
}

@Component({
  selector: 'delete-order-dialog',
  templateUrl: './../dialogs/delete-order-dialog.html',
  styleUrls: ['./orders-table.component.scss'],
})

export class DeleteOrderDialog {
  model: any;
  constructor(
    public dialogRef: MatDialogRef<DeleteOrderDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteDialogData) { }
}
