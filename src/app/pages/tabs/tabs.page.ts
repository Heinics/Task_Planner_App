import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, listOutline, calendarOutline, barChartOutline, personOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  templateUrl: './tabs.page.html',
  styleUrl: './tabs.page.scss'
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, listOutline, calendarOutline, barChartOutline, personOutline });
  }
}
