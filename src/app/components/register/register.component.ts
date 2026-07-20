import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent {
    constructor(private router: Router) {}

    onRegister(event: Event) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const data = new FormData(form);
        const email = data.get('email');
        alert(`Registering ${email}`);
        this.router.navigate(['/']);
    }

    goHome() {
        this.router.navigate(['/']);
    }

    handleLogin() {
        this.router.navigate(['/login']);
    }
}
