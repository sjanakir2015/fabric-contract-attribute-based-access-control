import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { EnrollComponent } from './enroll/enroll.component';
import { LoginComponent } from './login/login.component';
import { QueryorderComponent } from './queryorder/queryorder.component';
import { RegulatorComponent } from './regulator/regulator.component';
import { LauncherComponent } from './launcher/launcher.component';
import { PayloadownerComponent } from './payloadowner/payloadowner.component';

import { AuthGuard } from './_guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'enroll', component: EnrollComponent },
  { path: 'users', component: UserManagementComponent, canActivate: [AuthGuard] },
  // Portals
  { path: 'launcher', component: LauncherComponent, canActivate: [AuthGuard] },
  { path: 'payloadowner', component: PayloadownerComponent, canActivate: [AuthGuard] },
  { path: 'queryorder', component: QueryorderComponent },
  { path: 'regulator', component: RegulatorComponent, canActivate: [AuthGuard] },

  // otherwise redirect to login
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
