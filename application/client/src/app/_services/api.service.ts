import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { UserService } from './user.service';
import { BehaviorSubject, Observable } from '../../../node_modules/rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  id: String = "";
  pwd: String = "";
  shipperid: String = "";
  body: Object;
  options: Object;
  private OrdersData = new BehaviorSubject([]);
  orders$: Observable<any[]> = this.OrdersData.asObservable();

  statuses = {
    1:  "ASSET_CREATED",               // PAYLOAD_OWNER
    2:  "ASSET_DETAILS_VERIFIED",      // SATELLITE_MANUFACTURER
    3:  "ASSET_DETAILS_MODIFIED",      // PAYLOAD_OWNER
    4:  "ASSET_IN_TRANSIT",           // PAYLOAD_OWNER
    5:  "ASSET_RECEIVED",              // SATELLITE_MANUFACTURER
    6:  "ASSET_CLEAR_FOR_FLIGHT",
    7:  "ASSET_CLOSED"                 // Not currently used
  };

  baseUrl = "http://localhost:3000";

  constructor(private httpClient: HttpClient, private userService: UserService) {}

  getAllStatuses(){
    return this.statuses;
  }

  createUserAuthorizationHeader(headers: HttpHeaders) {
    const currentUser = this.userService.getCurrentUser();
    return headers.append('Authorization', 'Basic ' + btoa(currentUser.userid+':'+currentUser.password));
  }

  getAllUsers(){
    let headers = new HttpHeaders();
    //
    //  NOTE: an admin identity is needed to invoke this API since it calls the CA methods.
    headers = headers.append('Authorization', 'Basic ' + btoa('admin:adminpw'));
    // replace with this line to pass in the current user vs admin
    //headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.get(this.baseUrl + '/api/users/', {headers:headers});
  }

  // This API is used during login to get the details of specific user trying to log in
  // The 'usertype' is retrieved to set the currentUser for this application
  getUser(){
    let headers = new HttpHeaders();
    //
    //  NOTE: an admin identity is needed to invoke this API since it calls the CA methods.
    headers = headers.append('Authorization', 'Basic ' + btoa('admin:adminpw'));
    // replace with this line to pass in the user trying to log in vs admin
    //headers = headers.append('Authorization', 'Basic ' + btoa(this.id+':'+this.pwd));
    return this.httpClient.get(this.baseUrl + '/api/users/'+ this.id, {headers:headers});
  }

  // This API checks to see if user credentials exist in Wallet
  isUserEnrolled(){
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.get(this.baseUrl + '/api/is-user-enrolled/' + this.id, {headers:headers});
  }

  // NOTE: This API isn't invoked by the UI application.  It is provided to be invoked by URL only
  // As a result, an admin identity needs to call this
  queryAsset() {
    let headers = new HttpHeaders();
    //headers = this.createUserAuthorizationHeader(headers);
    headers = headers.append('Authorization', 'Basic ' + btoa('admin:adminpw'));
    return this.httpClient.get(this.baseUrl + '/api/assets/' + this.id, {headers:headers})
  }

  queryOrders() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    this.httpClient.get<any[]>(this.baseUrl + '/api/assets/', {headers:headers}).subscribe (orders => {
      console.log (orders);
      // Add status to each order, based on this.statuses
      for (let i of orders) {
        i.status = this.statuses[i.currentAssetState];
      }
      this.OrdersData.next(orders);
    }, error => {
      console.log(JSON.stringify(error));
      alert("Problem getting orders: " + error['error']['message']);
    })
  }

  clearOrders(){
    this.OrdersData.next([]);
  }

  deleteAsset(){
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.delete(this.baseUrl + '/api/assets/' + this.id, {headers:headers})
  }

  getAssetHistory() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.get(this.baseUrl + '/api/asset-history/' + this.id, {headers:headers})
  }

  /*  State changes and corresponding apis:
  ASSET_CREATED: 1,               // PAYLOAD_OWNER
  ASSET_DETAILS_VERIFIED: 2,      // SATELLITE_MANUFACTURER
  ASSET_DETAILS_MODIFIED: 3,      // PAYLOAD_OWNER
  ASSET_IN_TRANSIT: 4,            // PAYLOAD_OWNER
  ASSET_RECEIVED: 5,              // SATELLITE_MANUFACTURER
  ASSET_CLOSED: 6                 // Not currently used
  */

  //  Payload owner:  Create Payload asset;  set state to ASSET_CREATED
  /*createAsset() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.post(this.baseUrl + '/api/assets', this.body, {headers:headers})
  }
*/
  // =======================
  //  Payload owner:  Modify Payload details;  set state to ASSET_DETAILS_MODIFIED
  orderProduct() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.post(this.baseUrl + '/api/assets', this.body, {headers:headers})
  }
  //  satellite Manufacturer:  accept Payload;  set state to ASSET_DETAILS_VERIFIED
  assignSlot() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.put(this.baseUrl + '/api/verify-payload/' + this.id, {}, {headers:headers})
  }

  //  satellite Manufacturer:  accept Payload;  set state to ASSET_DETAILS_VERIFIED
  verifyPayload() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.put(this.baseUrl + '/api/verify-payload/' + this.id, {}, {headers:headers})
  }

  //  Payload owner:  Ship Payload and update state;  set state to ASSET_IN_TRANSIT
  shipPayload() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.put(this.baseUrl + '/api/ship-payload/' + this.id, {}, {headers:headers})
  }

  //  Satellite Manufacturer:  Received Payload shipment;  set state to ASSET_RECEIVED
  ShipmentReceived() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.put(this.baseUrl + '/api/receive-shipment/' + this.id, {}, {headers:headers})
  }

  //  Satellite Manufacturer:  Clear Payload for flight;  set state to ASSET_CLEAR_FOR_FLIGHT
  clearForFlight() {
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.put(this.baseUrl + '/api/clear-for-flight/' + this.id, {}, {headers:headers})
  }

  //  Payload owner:  Modify Payload details;  set state to ASSET_DETAILS_MODIFIED
  //   not used currently
  modifyPayload() {
    console.log ('api.body = ' + this.body);
    let headers = new HttpHeaders();
    headers = this.createUserAuthorizationHeader(headers);
    return this.httpClient.post(this.baseUrl + '/api/modify-payload', this.body, {headers:headers})
  }


}
