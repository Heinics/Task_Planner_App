import { Component, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  gridOutline, homeOutline, peopleOutline, barChartOutline, syncOutline
} from 'ionicons/icons';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  templateUrl: './tabs.page.html',
  styleUrl: './tabs.page.scss'
})
export class TabsPage {
  readonly health = inject(HealthService);

  constructor() {
    addIcons({ gridOutline, homeOutline, peopleOutline, barChartOutline, syncOutline });
  }
}
