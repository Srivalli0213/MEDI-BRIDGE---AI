import { Component, OnInit, NgZone } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(private zone: NgZone) {}
  currentView: 'home' | 'login' | 'register' | 'dashboard' = 'home';

  handleLogin() {
    this.currentView = 'login';
  }

  handleRegister() {
    this.currentView = 'register';
  }

  goHome() {
    this.currentView = 'home';
  }

  goDashboard() {
    this.currentView = 'dashboard';
  }

  // sample appointments shown on dashboard
  appointments: any[] = [
    { id: 1, patient: 'John Doe', doctor: 'Dr. Smith', datetime: '2026-08-01 10:30', status: 'Scheduled' },
    { id: 2, patient: 'Mary Johnson', doctor: 'Dr. Patel', datetime: '2026-08-02 14:00', status: 'Scheduled' },
    { id: 3, patient: 'Ali Khan', doctor: 'Dr. Lee', datetime: '2026-08-05 09:00', status: 'Scheduled' }
  ];

  cancelAppointment(id: number) {
    const appt = this.appointments.find(a => a.id === id);
    if (appt && appt.status !== 'Cancelled') {
      appt.status = 'Cancelled';
      // placeholder: hook into backend cancellation here
    }
  }

  viewAppointment(id: number) {
    const appt = this.appointments.find(a => a.id === id);
    if (appt) {
      alert(`Appointment for ${appt.patient}\nDoctor: ${appt.doctor}\nWhen: ${appt.datetime}\nStatus: ${appt.status}`);
    }
  }

  // Simple chat widget state and handlers
  messages: { sender: 'bot' | 'user', text: string, draft?: boolean }[] = [
    { sender: 'bot', text: 'Hello — I\'m MediBot. Ask me about appointments or patients.' }
  ];

  // voice helpers
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
        this.recognition.interimResults = true; // show live transcription
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => { this.listening = true; };
        this.recognition.onend = () => {
          // finalize any interim draft as a user message when recognition stops
          this.zone.run(() => {
            this.listening = false;
            this.transcriptDraft = '';
            const draftIdx = this.findDraftIndex('user');
            if (draftIdx !== -1) {
              const text = (this.messages[draftIdx].text || '').trim();
              if (text) {
                console.log('[MediBot] recognition.onend finalizing draft:', text);
                this.messages[draftIdx].draft = false;
                // trigger bot reply from the finalized draft
                this.generateBotReply(text);
              } else {
                // nothing to finalize
                (this.messages[draftIdx] as any).draft = false;
              }
            }
          });
        };
        this.recognition.onerror = (e: any) => { console.error('Speech recognition error', e); this.listening = false; this.transcriptDraft = ''; };
        this.recognition.onresult = (ev: any) => {
          // run inside Angular zone so UI updates immediately
          this.zone.run(() => {
            // gather interim + final transcript
            let interim = '';
            let final = '';
            for (let i = ev.resultIndex; i < ev.results.length; ++i) {
              const res = ev.results[i];
              const txt = (res[0] && (res[0].transcript || (res[0][0] && res[0][0].transcript))) ? (res[0].transcript || res[0][0].transcript) : '';
              if (res.isFinal) final += txt; else interim += txt;
            }
            // update live draft for UI: create or update a draft user message
            if (interim && interim.trim()) {
              const idx = this.ensureDraftMessage('user');
              this.messages[idx].text = interim;
              this.messages[idx].draft = true;
            }
            if (final && final.trim()) {
              // finalize draft message if exists
              const draftIdx = this.findDraftIndex('user');
              if (draftIdx !== -1) {
                this.messages[draftIdx].text = final.trim();
                this.messages[draftIdx].draft = false;
              } else {
                this.messages.push({ sender: 'user', text: final.trim() });
              }
              // trigger bot reply
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

  // Toggle listening from microphone
  toggleListening() {
    if (!this.recognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (this.listening) {
      try { this.recognition.stop(); } catch (e) { console.warn(e); }
      this.listening = false;
    } else {
      try { this.recognition.start(); } catch (e) { console.warn(e); }
      this.listening = true;
    }
  }

  // speak last bot message using TTS (plays and reveals if possible)
  speakLastBot() {
    const last = this.messages.slice().reverse().find(m => m.sender === 'bot');
    const text = last ? last.text : this.lastBotMessage;
    if (!text) return;
    const win = window as any;
    if (!win.speechSynthesis) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }
    // find index of last bot message to reveal during speech
    const botIdx = this.messages.slice().reverse().findIndex(m => m.sender === 'bot');
    const absoluteIdx = botIdx === -1 ? -1 : this.messages.length - 1 - botIdx;
    this.speakAndReveal(text, absoluteIdx);
  }

  // helper: ensure a draft message exists for sender, return its index
  ensureDraftMessage(sender: 'bot' | 'user') {
    const idx = this.findDraftIndex(sender);
    if (idx !== -1) return idx;
    // ensure push runs in Angular zone
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

  // Basic client-side NLP to generate replies for STT/TTS (no server)
  analyzeUserText(userText: string): string {
    const lower = (userText || '').toLowerCase();

    // cancel appointment intent
    if (lower.includes('cancel')) {
      for (const appt of this.appointments) {
        const name = (appt.patient || '').toLowerCase();
        if (lower.includes(name)) {
          if (appt.status !== 'Cancelled') {
            appt.status = 'Cancelled';
            return `Okay — the appointment for ${appt.patient} with ${appt.doctor} on ${appt.datetime} has been cancelled.`;
          } else {
            return `${appt.patient}'s appointment is already cancelled.`;
          }
        }
      }
      return 'Which appointment should I cancel? Please say the patient name.';
    }

    // list upcoming appointments
    if (lower.includes('appointments') || lower.includes('upcoming') || lower.includes('list')) {
      if (this.appointments.length === 0) return 'There are no appointments scheduled.';
      const lines = this.appointments.map(a => `${a.patient} with ${a.doctor} on ${a.datetime} — ${a.status}`);
      return 'Upcoming appointments:\n' + lines.join('\n');
    }

    // ask about a specific patient's appointment
    if (lower.includes('when') || lower.includes('what time') || lower.includes('date')) {
      for (const appt of this.appointments) {
        const name = (appt.patient || '').toLowerCase();
        if (lower.includes(name)) {
          return `${appt.patient} is scheduled with ${appt.doctor} on ${appt.datetime}. Status: ${appt.status}.`;
        }
      }
      return 'Which patient are you asking about?';
    }

    // general help
    if (lower.includes('help') || lower.includes('reminder') || lower.includes('summary')) {
      return 'I can list appointments, tell you details for a patient, or cancel an appointment if you say "cancel <patient name>".';
    }

    // fallback echo with slight NLP flavor
    return `I heard: "${userText}". I can help with appointments, patient summaries, and reminders.`;
  }

  // generate bot reply (uses local NLP)
  generateBotReply(userText: string) {
    const reply = this.analyzeUserText(userText);
    console.log('[MediBot] generateBotReply userText:', userText, 'reply:', reply);
    // create draft bot message
    const idx = this.ensureDraftMessage('bot');
    // show reply text immediately (safe UI fallback) then attempt TTS
    this.zone.run(() => {
      if (idx >= 0 && this.messages[idx]) {
        this.messages[idx].text = reply;
        (this.messages[idx] as any).draft = true;
      }
    });
    // start speak+reveal
    try {
      this.speakAndReveal(reply, idx);
    } catch (e) {
      console.error('[MediBot] speakAndReveal threw', e);
      // reveal text as fallback
      this.zone.run(() => {
        if (idx >= 0 && this.messages[idx]) {
          this.messages[idx].text = reply;
          (this.messages[idx] as any).draft = false;
        }
      });
    }
    this.lastBotMessage = reply;
  }

  // speak text with progressive reveal in message at index (if index === -1, push new)
  speakAndReveal(text: string, index: number) {
    console.log('[MediBot] speakAndReveal called, index=', index, 'text=', text);
    const win = window as any;
    // if speechSynthesis supports boundary events, use them to reveal progressively
    const supportsBoundary = !!(win && win.speechSynthesis && (typeof (SpeechSynthesisUtterance.prototype as any).onboundary !== 'undefined'));
    console.log('[MediBot] speechSynthesis available=', !!win.speechSynthesis, 'supportsBoundary=', supportsBoundary);

    if (index === -1) {
      this.messages.push({ sender: 'bot', text: '', draft: true } as any);
      index = this.messages.length - 1;
    }

    if (!win.speechSynthesis) {
      // no TTS: just show full text
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

      // choose a voice explicitly if available
      try {
        const avail = win.speechSynthesis.getVoices() || [];
        let chosen: any = null;
        if (avail.length) {
          chosen = avail.find((v: any) => (v.lang || '').toLowerCase().startsWith('en')) || avail[0];
          utter.voice = chosen;
          console.log('[MediBot] selected voice=', chosen.name, chosen.lang);
        } else {
          console.log('[MediBot] no voices available to select');
        }
      } catch (e) {
        console.warn('[MediBot] selecting voice failed', e);
      }

      // try to reveal progressively when boundary events are available
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

      // fallback progressive reveal by words
      const words = text.split(' ');
      let revealed = 0;
      const wpm = 160;
      const interval = Math.max(40, Math.round(60000 / wpm));
      let timer: any = null;
      let started = false;
      utter.onstart = () => {
        started = true;
        console.log('[MediBot] utter.onstart');
        // start fallback timer if boundary isn't firing
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

      // fallback: if onstart never fires (blocked), reveal full text after a short timeout
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

      // speak
      try {
        win.speechSynthesis.cancel();
        win.speechSynthesis.speak(utter);
      } catch (e) {
        console.error('[MediBot] speechSynthesis.speak threw', e);
        // ensure UI still shows reply
        this.zone.run(() => {
          this.messages[index].text = text;
          (this.messages[index] as any).draft = false;
        });
      }
    };

    // ensure voices are loaded before speaking
    const voices = win.speechSynthesis.getVoices();
    console.log('[MediBot] available voices count=', voices ? voices.length : 0, voices);
    if (!voices || voices.length === 0) {
      // wait for voiceschanged event then speak
      const onVoices = () => {
        console.log('[MediBot] voiceschanged fired, voices=', win.speechSynthesis.getVoices());
        win.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        startSpeaking();
      };
      win.speechSynthesis.addEventListener('voiceschanged', onVoices);
      // also attempt to start after a short timeout in case event doesn't fire
      setTimeout(() => { if (win.speechSynthesis.getVoices().length > 0) startSpeaking(); }, 500);
    } else {
      startSpeaking();
    }
  }

  onSendChat(text: string) {
    const t = (text || '').trim();
    console.log('[MediBot] onSendChat text=', t);
    if (!t) return;
    // record user message
    this.messages.push({ sender: 'user', text: t });

    // generate bot reply immediately (short delay not needed)
    try {
      this.generateBotReply(t);
    } catch (e) {
      console.error('[MediBot] generateBotReply threw', e);
    }
  }

  // Debug helper: trigger a sample reply to verify NLP/TTS pipeline
  testBot() {
    const sample = 'list appointments';
    console.log('[MediBot] testBot triggered, sending:', sample);
    // ensure UI updates by running in the Angular zone and adding an immediate bot message for visibility
    this.zone.run(() => {
      this.messages.push({ sender: 'user', text: sample });
      // add an immediate placeholder bot message so user sees something even if TTS fails
      const placeholderIdx = this.messages.push({ sender: 'bot', text: 'Thinking...', draft: true }) - 1;
      this.lastBotMessage = 'Thinking...';
      try {
        this.generateBotReply(sample);
      } catch (e) {
        console.error('[MediBot] testBot generateBotReply threw', e);
        // reveal fallback text
        this.messages[placeholderIdx].text = 'Sorry — an error occurred generating the reply.';
        (this.messages[placeholderIdx] as any).draft = false;
      }
    });
  }

  focusChatInput() {
    // small helper to focus input when robot avatar clicked
    setTimeout(() => {
      const el = document.querySelector('.chat-input-row input') as HTMLInputElement | null;
      if (el) el.focus();
    });
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
