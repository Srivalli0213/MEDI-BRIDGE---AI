import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    constructor(private router: Router) {}

    goHome() {
        this.router.navigate(['/']);
    }

    handleLogin() {
        this.router.navigate(['/login']);
    }

    handleRegister() {
        this.router.navigate(['/register']);
    }
}
