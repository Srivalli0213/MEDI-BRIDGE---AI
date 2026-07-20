import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    constructor(private router: Router) {}

    onLogin(event: Event) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const data = new FormData(form);
        const email = data.get('email');
        alert(`Logging in as ${email}`);
        this.router.navigate(['/']);
    }

    goHome() {
        this.router.navigate(['/']);
    }

    handleRegister() {
        this.router.navigate(['/register']);
    }
}
