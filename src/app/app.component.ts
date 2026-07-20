import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  currentView: 'home' | 'login' | 'register' = 'home';

  handleLogin() {
    this.currentView = 'login';
  }

  handleRegister() {
    this.currentView = 'register';
  }

  goHome() {
    this.currentView = 'home';
  }

  onLogin(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const email = data.get('email');
    // TODO: wire up real auth call
    alert(`Logging in as ${email}`);
    this.currentView = 'home';
  }

  onRegister(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const email = data.get('email');
    alert(`Registering ${email}`);
    this.currentView = 'home';
  }
}
