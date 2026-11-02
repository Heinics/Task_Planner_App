import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonButton, IonInput, IonCheckbox, IonIcon, AlertController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { medkit } from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, IonContent, IonButton, IonInput, IonCheckbox, IonIcon],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastController);
  private alert = inject(AlertController);

  username = '';
  password = '';
  remember = true;
  busy = false;

  constructor() {
    addIcons({ medkit });
    if (this.auth.session()) this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  async login() {
    if (!this.username.trim() || !this.password) {
      return this.fail('Enter your username and password.');
    }
    this.busy = true;
    const error = await this.auth.login(this.username, this.password, this.remember);
    this.busy = false;
    if (error) return this.fail(error);
    return this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  async forgot() {
    const a = await this.alert.create({
      header: 'Reset password',
      message: 'Ask your RHU nurse or system admin to reset your password. Self-service reset needs the CHIA server and is not available offline.',
      buttons: ['OK']
    });
    await a.present();
  }

  private async fail(message: string) {
    const t = await this.toast.create({ message, duration: 2400, color: 'danger' });
    await t.present();
  }
}
