import { Component, Input, OnInit, NgZone } from '@angular/core';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
    constructor(private zone: NgZone) {}

    @Input() appointments: any[] = [];

    messages: { sender: 'bot' | 'user', text: string, draft?: boolean }[] = [
        { sender: 'bot', text: 'Hello — I\'m MediBot. Ask me about appointments or patients.' }
    ];

    recognition: any = null;
    listening = false;
    lastBotMessage = '';
    transcriptDraft = '';

    ngOnInit() {
        const win = window as any;
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition || null;
        if (SpeechRec) {
            try {
                this.recognition = new SpeechRec();
                this.recognition.lang = 'en-US';
                this.recognition.interimResults = true;
                this.recognition.maxAlternatives = 1;

                this.recognition.onstart = () => { this.listening = true; };
                this.recognition.onend = () => {
                    this.zone.run(() => {
                        this.listening = false;
                        this.transcriptDraft = '';
                        const draftIdx = this.findDraftIndex('user');
                        if (draftIdx !== -1) {
                            const text = (this.messages[draftIdx].text || '').trim();
                            if (text) {
                                console.log('[MediBot] recognition.onend finalizing draft:', text);
                                this.messages[draftIdx].draft = false;
                                this.generateBotReply(text);
                            }
                            else {
                                (this.messages[draftIdx] as any).draft = false;
                            }
                        }
                    });
                };
                this.recognition.onerror = (e: any) => { console.error('Speech recognition error', e); this.listening = false; this.transcriptDraft = ''; };
                this.recognition.onresult = (ev: any) => {
                    this.zone.run(() => {
                        let interim = '';
                        let final = '';
                        for (let i = ev.resultIndex; i < ev.results.length; ++i) {
                            const res = ev.results[i];
                            const txt = (res[0] && (res[0].transcript || (res[0][0] && res[0][0].transcript))) ? (res[0].transcript || res[0][0].transcript) : '';
                            if (res.isFinal) final += txt; else interim += txt;
                        }
                        if (interim && interim.trim()) {
                            const idx = this.ensureDraftMessage('user');
                            this.messages[idx].text = interim;
                            this.messages[idx].draft = true;
                        }
                        if (final && final.trim()) {
                            const draftIdx = this.findDraftIndex('user');
                            if (draftIdx !== -1) {
                                this.messages[draftIdx].text = final.trim();
                                this.messages[draftIdx].draft = false;
                            }
                            else {
                                this.messages.push({ sender: 'user', text: final.trim() });
                            }
                            this.generateBotReply(final.trim());
                        }
                    });
                };
            } catch (err) {
                console.warn('SpeechRecognition init failed', err);
                this.recognition = null;
            }
        }
    }

    toggleListening() {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser.');
            return;
        }

        if (this.listening) {
            try { this.recognition.stop(); } catch (e) { console.warn(e); }
            this.listening = false;
        }
        else {
            try { this.recognition.start(); } catch (e) { console.warn(e); }
            this.listening = true;
        }
    }

    speakLastBot() {
        const last = this.messages.slice().reverse().find(m => m.sender === 'bot');
        const text = last ? last.text : this.lastBotMessage;
        if (!text) return;
        const win = window as any;
        if (!win.speechSynthesis) {
            alert('Speech synthesis not supported in this browser.');
            return;
        }
        const botIdx = this.messages.slice().reverse().findIndex(m => m.sender === 'bot');
        const absoluteIdx = botIdx === -1 ? -1 : this.messages.length - 1 - botIdx;
        this.speakAndReveal(text, absoluteIdx);
    }

    ensureDraftMessage(sender: 'bot' | 'user') {
        const idx = this.findDraftIndex(sender);
        if (idx !== -1) return idx;
        let newIdx = -1;
        this.zone.run(() => {
            this.messages.push({ sender, text: '', draft: true } as any);
            newIdx = this.messages.length - 1;
        });
        return newIdx;
    }

    findDraftIndex(sender: 'bot' | 'user') {
        return this.messages.findIndex(m => (m as any).draft && m.sender === sender);
    }

    analyzeUserText(userText: string): string {
        const lower = (userText || '').toLowerCase();

        if (lower.includes('cancel')) {
            for (const appt of this.appointments) {
                const name = (appt.patient || '').toLowerCase();
                if (lower.includes(name)) {
                    if (appt.status !== 'Cancelled') {
                        appt.status = 'Cancelled';
                        return `Okay — the appointment for ${appt.patient} with ${appt.doctor} on ${appt.datetime} has been cancelled.`;
                    }
                    else {
                        return `${appt.patient}'s appointment is already cancelled.`;
                    }
                }
            }
            return 'Which appointment should I cancel? Please say the patient name.';
        }

        if (lower.includes('appointments') || lower.includes('upcoming') || lower.includes('list')) {
            if (this.appointments.length === 0) return 'There are no appointments scheduled.';
            const lines = this.appointments.map(a => `${a.patient} with ${a.doctor} on ${a.datetime} — ${a.status}`);
            return 'Upcoming appointments:\n' + lines.join('\n');
        }

        if (lower.includes('when') || lower.includes('what time') || lower.includes('date')) {
            for (const appt of this.appointments) {
                const name = (appt.patient || '').toLowerCase();
                if (lower.includes(name)) {
                    return `${appt.patient} is scheduled with ${appt.doctor} on ${appt.datetime}. Status: ${appt.status}.`;
                }
            }
            return 'Which patient are you asking about?';
        }

        if (lower.includes('help') || lower.includes('reminder') || lower.includes('summary')) {
            return 'I can list appointments, tell you details for a patient, or cancel an appointment if you say "cancel <patient name>".';
        }

        return `I heard: "${userText}". I can help with appointments, patient summaries, and reminders.`;
    }

    generateBotReply(userText: string) {
        const reply = this.analyzeUserText(userText);
        console.log('[MediBot] generateBotReply userText:', userText, 'reply:', reply);
        const idx = this.ensureDraftMessage('bot');
        this.zone.run(() => {
            if (idx >= 0 && this.messages[idx]) {
                this.messages[idx].text = reply;
                (this.messages[idx] as any).draft = true;
            }
        });
        try {
            this.speakAndReveal(reply, idx);
        } catch (e) {
            console.error('[MediBot] speakAndReveal threw', e);
            this.zone.run(() => {
                if (idx >= 0 && this.messages[idx]) {
                    this.messages[idx].text = reply;
                    (this.messages[idx] as any).draft = false;
                }
            });
        }
        this.lastBotMessage = reply;
    }

    speakAndReveal(text: string, index: number) {
        console.log('[MediBot] speakAndReveal called, index=', index, 'text=', text);
        const win = window as any;
        const supportsBoundary = !!(win && win.speechSynthesis && (typeof (SpeechSynthesisUtterance.prototype as any).onboundary !== 'undefined'));
        console.log('[MediBot] speechSynthesis available=', !!win.speechSynthesis, 'supportsBoundary=', supportsBoundary);

        if (index === -1) {
            this.messages.push({ sender: 'bot', text: '', draft: true } as any);
            index = this.messages.length - 1;
        }

        if (!win.speechSynthesis) {
            console.debug('[MediBot] No speechSynthesis - revealing text only');
            this.messages[index].text = text;
            (this.messages[index] as any).draft = false;
            return;
        }

        const startSpeaking = () => {
            console.log('[MediBot] startSpeaking() - creating utterance');
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'en-US';
            utter.rate = 1.0;
            utter.volume = 1.0;

            try {
                const avail = win.speechSynthesis.getVoices() || [];
                let chosen: any = null;
                if (avail.length) {
                    chosen = avail.find((v: any) => (v.lang || '').toLowerCase().startsWith('en')) || avail[0];
                    utter.voice = chosen;
                    console.log('[MediBot] selected voice=', chosen.name, chosen.lang);
                }
                else {
                    console.log('[MediBot] no voices available to select');
                }
            } catch (e) {
                console.warn('[MediBot] selecting voice failed', e);
            }

            try {
                utter.onboundary = (ev: any) => {
                    const charIndex = ev.charIndex || 0;
                    console.log('[MediBot] onboundary charIndex=', charIndex);
                    this.zone.run(() => {
                        this.messages[index].text = text.slice(0, charIndex);
                    });
                };
            } catch (e) {
                console.warn('[MediBot] onboundary not supported', e);
            }

            const words = text.split(' ');
            let revealed = 0;
            const wpm = 160;
            const interval = Math.max(40, Math.round(60000 / wpm));
            let timer: any = null;
            let started = false;
            utter.onstart = () => {
                started = true;
                console.log('[MediBot] utter.onstart');
                timer = setInterval(() => {
                    revealed++;
                    this.zone.run(() => {
                        this.messages[index].text = words.slice(0, revealed).join(' ');
                    });
                    if (revealed >= words.length) {
                        clearInterval(timer);
                        timer = null;
                    }
                }, interval);
            };

            setTimeout(() => {
                if (!started) {
                    console.log('[MediBot] TTS start timeout — revealing text as fallback');
                    this.zone.run(() => {
                        this.messages[index].text = text;
                        (this.messages[index] as any).draft = false;
                    });
                }
            }, 1200);

            utter.onend = () => {
                console.log('[MediBot] utter.onend');
                if (timer) { clearInterval(timer); timer = null; }
                this.zone.run(() => {
                    this.messages[index].text = text;
                    (this.messages[index] as any).draft = false;
                });
            };

            utter.onerror = (ev: any) => {
                console.error('[MediBot] utter.onerror', ev);
            };

            try {
                win.speechSynthesis.cancel();
                win.speechSynthesis.speak(utter);
            } catch (e) {
                console.error('[MediBot] speechSynthesis.speak threw', e);
                this.zone.run(() => {
                    this.messages[index].text = text;
                    (this.messages[index] as any).draft = false;
                });
            }
        };

        const voices = win.speechSynthesis.getVoices();
        console.log('[MediBot] available voices count=', voices ? voices.length : 0, voices);
        if (!voices || voices.length === 0) {
            const onVoices = () => {
                console.log('[MediBot] voiceschanged fired, voices=', win.speechSynthesis.getVoices());
                win.speechSynthesis.removeEventListener('voiceschanged', onVoices);
                startSpeaking();
            };
            win.speechSynthesis.addEventListener('voiceschanged', onVoices);
            setTimeout(() => { if (win.speechSynthesis.getVoices().length > 0) startSpeaking(); }, 500);
        }
        else {
            startSpeaking();
        }
    }

    onSendChat(text: string) {
        const t = (text || '').trim();
        console.log('[MediBot] onSendChat text=', t);
        if (!t) return;
        this.messages.push({ sender: 'user', text: t });

        try {
            this.generateBotReply(t);
        } catch (e) {
            console.error('[MediBot] generateBotReply threw', e);
        }
    }

    testBot() {
        const sample = 'list appointments';
        console.log('[MediBot] testBot triggered, sending:', sample);
        this.zone.run(() => {
            this.messages.push({ sender: 'user', text: sample });
            const placeholderIdx = this.messages.push({ sender: 'bot', text: 'Thinking...', draft: true }) - 1;
            this.lastBotMessage = 'Thinking...';
            try {
                this.generateBotReply(sample);
            } catch (e) {
                console.error('[MediBot] testBot generateBotReply threw', e);
                this.messages[placeholderIdx].text = 'Sorry — an error occurred generating the reply.';
                (this.messages[placeholderIdx] as any).draft = false;
            }
        });
    }

    focusChatInput() {
        setTimeout(() => {
            const el = document.querySelector('.chat-input-row input') as HTMLInputElement | null;
            if (el) el.focus();
        });
    }
}
