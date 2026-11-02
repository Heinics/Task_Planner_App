import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput, AlertController, ToastController
} from '@ionic/angular';

import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage {
  private alert = inject(AlertController);
  private toast = inject(ToastController);
  readonly svc = inject(TaskService);

  form = { name: this.svc.profile().name, email: this.svc.profile().email };

  readonly initial = computed(() => (this.svc.profile().name.trim().charAt(0) || 'U').toUpperCase());

  async save() {
    this.svc.saveProfile(this.form);
    this.form = { name: this.svc.profile().name, email: this.svc.profile().email };
    const t = await this.toast.create({ message: 'Profile saved.', duration: 1800 });
    await t.present();
  }

  loadSample() {
    this.svc.loadSampleData();
  }

  async clearAll() {
    const a = await this.alert.create({
      header: 'Delete all tasks?',
      message: 'This removes every task on this device and cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete all', role: 'destructive', handler: () => this.svc.clearAll() }
      ]
    });
    await a.present();
  }
}
