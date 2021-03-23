import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule, MatCheckboxModule, MatDialogModule, MatDividerModule, MatFormFieldModule, MatGridListModule, MatIconModule, MatInputModule,MatMenuModule,MatProgressBarModule, MatStepperModule,MatTableModule,MatTabsModule, MatToolbarModule, MatTooltipModule } from '@angular/material';

/* Components */
import { HomeComponent } from './home/home.component';
import { AppComponent } from './app.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { LoginComponent } from './login/login.component';
import { EnrollComponent } from './enroll/enroll.component';
import { QueryorderComponent } from './queryorder/queryorder.component';
import { RegulatorComponent } from './regulator/regulator.component';
import { PayloadownerComponent } from './payloadowner/payloadowner.component';
import { LauncherComponent } from './launcher/launcher.component';

/* Partial Components */
import { OrderFormComponent } from './_partials/order-form/order-form.component';
import { OrderHistoryComponent } from './_partials/order-history/order-history.component';
import { OrdersTableComponent } from './_partials/orders-table/orders-table.component';
import { ToShipperDialog } from './_partials/orders-table/orders-table.component';
import { DeleteOrderDialog } from './_partials/orders-table/orders-table.component';

/* Services */
import { ApiService, AuthService, UserService } from './_services/index';
import { AuthGuard } from './_guards/auth.guard';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    EnrollComponent,

    LauncherComponent,
    PayloadownerComponent,

    QueryorderComponent,
    RegulatorComponent,
    UserManagementComponent,
    OrderFormComponent,
    OrderHistoryComponent,
    OrdersTableComponent,
    ToShipperDialog,
    DeleteOrderDialog
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    MatTableModule,
    MatToolbarModule
  ],
  providers: [
    ApiService,
    AuthService,
    UserService,
    AuthGuard
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    ToShipperDialog,
    DeleteOrderDialog
  ]
})
export class AppModule { }
