import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
    constructor(private router: Router) {}

    appointments: any[] = [
        { id: 1, patient: 'John Doe', doctor: 'Dr. Smith', datetime: '2026-08-01 10:30', status: 'Scheduled' },
        { id: 2, patient: 'Mary Johnson', doctor: 'Dr. Patel', datetime: '2026-08-02 14:00', status: 'Scheduled' },
        { id: 3, patient: 'Ali Khan', doctor: 'Dr. Lee', datetime: '2026-08-05 09:00', status: 'Scheduled' }
    ];

    cancelAppointment(id: number) {
        const appt = this.appointments.find(a => a.id === id);
        if (appt && appt.status !== 'Cancelled') {
            appt.status = 'Cancelled';
        }
    }

    viewAppointment(id: number) {
        const appt = this.appointments.find(a => a.id === id);
        if (appt) {
            alert(`Appointment for ${appt.patient}\nDoctor: ${appt.doctor}\nWhen: ${appt.datetime}\nStatus: ${appt.status}`);
        }
    }

    goHome() {
        this.router.navigate(['/']);
    }
}
