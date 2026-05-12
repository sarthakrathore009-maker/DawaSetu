const defaultState = {
    user: null,
    medicines: [],
    history: [],
    contacts: [],
    settings: {
        language: 'en',
        elderlyMode: false,
        caregiverMode: false,
        isListening: false // <--- Add this line
    }
};

class DawaSetuApp {
    constructor() {
        this.state = JSON.parse(localStorage.getItem('dawasetu_state')) || defaultState;
        if (!this.state.settings.theme) this.state.settings.theme = 'light';
        this.init();
    }

    toggleProfileMenu(event) {
        event.stopPropagation();
        const menu = document.getElementById('profile-dropdown');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        
        const usernameEl = document.getElementById('dropdown-username');
        if (usernameEl) usernameEl.textContent = this.state.user || 'Guest';

        const closeMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
        };
        document.addEventListener('click', closeMenu);
    }

    toggleTheme() {
        this.state.settings.theme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
        this.applySettings();
        this.saveState();
        document.getElementById('profile-dropdown').style.display = 'none';
    }

    init() {
        // Initialize Icons
        lucide.createIcons();

        // Bind DOM Elements
        this.bindEvents();

        // Apply settings
        this.applySettings();

        // Update UI
        this.updateDashboard();
        this.renderMedicines();
        this.renderHistory();
        this.renderInsights();
        this.renderContacts();

        // Check Auth
        if (!this.state.user) {
            this.showAuthView();
        } else {
            this.showAppView();
        }

        // Run Smart Miss Detection Engine
        this.runMissDetectionEngine();
        
        // Update greeting based on time
        this.updateGreeting();
        
    }

    saveState() {
        localStorage.setItem('dawasetu_state', JSON.stringify(this.state));
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.getAttribute('data-target');
                this.navigate(target);
               
            });
        });

        // Settings Toggles
        document.getElementById('elder-toggle').addEventListener('click', (e) => {
            this.state.settings.elderlyMode = !this.state.settings.elderlyMode;
            e.currentTarget.classList.toggle('active', this.state.settings.elderlyMode);
            this.applySettings();
            this.saveState();
        });

        document.getElementById('caregiver-toggle').addEventListener('click', (e) => {
            this.state.settings.caregiverMode = !this.state.settings.caregiverMode;
            e.currentTarget.classList.toggle('active', this.state.settings.caregiverMode);
            this.applySettings();
            this.saveState();
            this.renderContacts();
        });

        // Add Medicine Form
        document.getElementById('add-medicine-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMedicine();
        });

        // Add Contact Form
        document.getElementById('add-contact-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addContact();
        });

        // Modal close
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('contact-modal').classList.remove('active');
        });
        
        // History Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.renderHistory(e.currentTarget.getAttribute('data-filter'));
            });
        });
    }

    toggleLangMenu(event) {
        event.stopPropagation();
        const menu = document.getElementById('lang-dropdown');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

        const closeMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
        };
        document.addEventListener('click', closeMenu);
    }

    setLanguage(lang) {
        this.state.settings.language = lang;
        
        // Trigger the Google Translate engine
        const googleSelect = document.querySelector('.goog-te-combo');
        if (googleSelect) {
            googleSelect.value = lang;
            googleSelect.dispatchEvent(new Event('change'));
        }

        this.applySettings();
        this.saveState();
        document.getElementById('lang-dropdown').style.display = 'none';
    }

    applySettings() {
        // Theme
        if (this.state.settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Elderly Mode
        if (this.state.settings.elderlyMode) {
            document.body.classList.add('elderly-mode');
            document.getElementById('elder-toggle').classList.add('active');
        } else {
            document.body.classList.remove('elderly-mode');
            document.getElementById('elder-toggle').classList.remove('active');
        }

        // Language
        const langTextEl = document.querySelector('.lang-text');
        if (langTextEl) {
            langTextEl.textContent = this.state.settings.language.toUpperCase();
        }
        this.translateUI();
    }

    translateUI() {
        const lang = this.state.settings.language;
        const dict = window.translations[lang] || window.translations['en'];
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                    // Placeholder translation not fully implemented, simplify
                } else {
                    el.textContent = dict[key];
                }
            }
        });
        this.updateGreeting();
    }

    navigate(viewId) {
        // Update nav items
        let titleUpdated = false;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === viewId) {
                item.classList.add('active');
                const titleKey = item.querySelector('span').getAttribute('data-i18n');
                const lang = this.state.settings.language;
                const dict = window.translations[lang] || window.translations['en'];
                document.getElementById('header-title').textContent = dict[titleKey];
                titleUpdated = true;
            }
        });
        
        if (!titleUpdated && viewId === 'legal') {
            document.getElementById('header-title').textContent = "Legal & Policies";
        }

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewId).classList.add('active');
        
        if (viewId === 'dashboard') {
            this.updateDashboard();
        } else if (viewId === 'insights') {
            this.renderInsights();
        }
    }

    showAuthView() {
        document.querySelector('.navigation').style.display = 'none';
        document.querySelector('.app-header').style.display = 'none';
        
        const fab = document.querySelector('.fab');
        if (fab) fab.style.display = 'none';
        
        const chatWidget = document.getElementById('chat-widget');
        if (chatWidget) chatWidget.style.display = 'none';
        
        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        // Show auth view
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('auth').classList.add('active');
    }

    showAppView() {
        document.querySelector('.navigation').style.display = 'flex';
        document.querySelector('.app-header').style.display = 'flex';
        
        // Check for mobile to show FAB properly via CSS media queries, but just clear inline display none
        const fab = document.querySelector('.fab');
        if (fab) fab.style.display = ''; 
        
        const chatWidget = document.getElementById('chat-widget');
        if (chatWidget) chatWidget.style.display = 'block';
        
        // Show username
        const nameEl = document.getElementById('user-display-name');
        if(nameEl && this.state.user) {
            nameEl.textContent = this.state.user;
            nameEl.style.display = 'block';
        }

        // Navigate to dashboard if currently on auth
        const currentView = document.querySelector('.view.active');
        if (!currentView || currentView.id === 'auth') {
            this.navigate('dashboard');
        }
    }
    
    loginAsGuest() {
        const guestId = Math.floor(1000 + Math.random() * 9000);
        const currentLanguage = this.state.settings ? this.state.settings.language : 'en';
        
        // Reset state for a completely fresh guest account
        this.state = {
            user: `Guest_${guestId}`,
            medicines: [],
            history: [],
            contacts: [],
            settings: {
                language: currentLanguage,
                elderlyMode: false,
                caregiverMode: false,
                isListening: false,
                theme: this.state.settings.theme || 'light'
            }
        };
        
        this.saveState();
        
        // Refresh the page to guarantee the UI is completely reset to the new empty state
        window.location.reload();
    }

    logout() {
        this.state.user = null;
        this.saveState();
        this.showAuthView();
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greetingKey = 'good_morning';
        if (hour >= 12 && hour < 17) greetingKey = 'good_afternoon';
        else if (hour >= 17) greetingKey = 'good_evening';
        
        const lang = this.state.settings.language;
        const dict = window.translations[lang] || window.translations['en'];
        document.getElementById('greeting-text').textContent = dict[greetingKey];
    }

    // AI Chatbot Logic
    toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow.style.display === 'none') {
            chatWindow.style.display = 'flex';
        } else {
            chatWindow.style.display = 'none';
        }
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        
        const messagesContainer = document.getElementById('chat-messages');
        
        // Add user message
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-message user-message';
        userDiv.textContent = text;
        messagesContainer.appendChild(userDiv);
        
        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Simulate AI response
        setTimeout(() => {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'chat-message ai-message';
            aiDiv.textContent = "I'm a frontend demo assistant! I'll be fully connected to the backend soon to assist with: " + text;
            messagesContainer.appendChild(aiDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1000);
    }
    
    toggleVoice() {
        const voiceBtn = document.getElementById('voice-btn');
        const isListening = voiceBtn.classList.contains('listening');
        
        if (isListening) {
            voiceBtn.classList.remove('listening');
            const input = document.getElementById('chat-input');
            input.value = "Did I take my medicine today?";
        } else {
            voiceBtn.classList.add('listening');
            setTimeout(() => {
                this.toggleVoice();
            }, 3000); // Auto stop after 3 seconds for demo
        }
    }
    
   // Add these variables to your DawaSetuApp class (after the constructor)
    isListening = false;
    recognition = null;

    getSpeechLang() {
        const lang = this.state.settings.language;
        const map = { 'en': 'en-US', 'hi': 'hi-IN', 'es': 'es-ES', 'fr': 'fr-FR', 'ar': 'ar-SA' };
        return map[lang] || 'en-US';
    }

    speakVoice(key, medName) {
        const lang = this.state.settings.language;
        const dict = window.translations[lang] || window.translations['en'];
        let textToSpeak = dict[key] || window.translations['en'][key];
        
        if (medName) {
            textToSpeak = textToSpeak.replace('{med}', medName);
        }

        const responseBox = document.getElementById('voice-response-box');
        if (responseBox) responseBox.innerText = textToSpeak;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance();
            msg.text = textToSpeak;
            msg.lang = this.getSpeechLang();
            window.speechSynthesis.speak(msg);
        }
    }

    toggleMainVoice() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert("Voice recognition is not supported in this browser.");
            return;
        }

        if (!this.recognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                const transcriptBox = document.getElementById('voice-transcript-box');
                if (transcriptBox) {
                    transcriptBox.style.display = 'block';
                    transcriptBox.innerText = `🗣️ "${transcript}"`;
                }
                this.parseMedicineVoice(transcript);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                const btn = document.getElementById('main-voice-btn');
                if (btn) {
                    btn.classList.remove('listening');
                    btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                }
            };
        }

        this.recognition.lang = this.getSpeechLang();

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
            this.isListening = true;
            
            const transcriptBox = document.getElementById('voice-transcript-box');
            if (transcriptBox) transcriptBox.style.display = 'none';
            
            this.speakVoice('voice_listening');
            
            const btn = document.getElementById('main-voice-btn');
            if (btn) {
                btn.classList.add('listening');
                btn.style.boxShadow = '0 0 0 8px rgba(255,255,255,0.4)';
            }
        }
    }

    parseMedicineVoice(text) {
        // Simple fallback regex to capture first/second word if it doesn't match English strict format
        const addPattern = /(?:add|log|new|jo|jodo|anadir|ajouter|idaafa)\s+([a-zA-Z\d\s]+?)(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?$/i;
        const match = text.match(addPattern);

        let medName = "";
        let rawTime = "08:00 AM";

        if (match) {
            medName = match[1].trim();
            if (match[2]) rawTime = match[2];
        } else if (text.length > 2) {
            // Very simple extraction for multi-lingual fallback
            const words = text.split(" ");
            medName = words.length > 1 ? words[1] : words[0]; 
        } else {
            this.speakVoice('voice_fail');
            return;
        }

        const newMed = {
            id: this.generateId(),
            name: medName.charAt(0).toUpperCase() + medName.slice(1),
            dosage: "1 Tablet",
            timing: rawTime.toLowerCase().includes('pm') ? 'Evening' : 'Morning',
            frequency: "Daily",
            startDate: new Date().toISOString().split('T')[0],
            endDate: "",
            critical: false,
            createdAt: new Date().toISOString()
        };

        // PUSH TO STATE
        this.state.medicines.push(newMed);
        
        // SAVE AND REFRESH UI
        this.saveState();
        this.renderMedicines();
        this.updateDashboard();

        this.speakVoice('voice_success', newMed.name);
        
        setTimeout(() => {
            if (!this.isListening) {
                const tBox = document.getElementById('voice-transcript-box');
                if (tBox) tBox.style.display = 'none';
                this.speakVoice('voice_idle');
            }
        }, 5000);
    }
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    addMedicine() {
        const newMed = {
            id: this.generateId(),
            name: document.getElementById('med-name').value,
            dosage: document.getElementById('med-dosage').value,
            timing: document.getElementById('med-timing').value,
            frequency: document.getElementById('med-frequency').value,
            startDate: document.getElementById('med-start-date').value,
            endDate: document.getElementById('med-end-date').value,
            critical: document.getElementById('med-critical').checked,
            createdAt: new Date().toISOString()
        };

        this.state.medicines.push(newMed);
        this.saveState();
        
        // Reset form and navigate
        document.getElementById('add-medicine-form').reset();
        this.navigate('dashboard');
        this.renderMedicines();
    }
     // Function to show/hide the three-dot menu
toggleMedMenu(event, medId) {
    event.stopPropagation();
    const allMenus = document.querySelectorAll('.med-dropdown');
    allMenus.forEach(menu => {
        if (menu.id !== `menu-${medId}`) menu.style.display = 'none';
    });
    
    const menu = document.getElementById(`menu-${medId}`);
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

    // Close menu when clicking anywhere else
    const closeMenu = () => {
        menu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
    };
    document.addEventListener('click', closeMenu);
}

// Function to remove medicine and clean up history to protect adherence score
removeMedicine(medId) {
    if (confirm('Are you sure you want to remove this medicine? This will also remove its history so it doesn\'t affect your score.')) {
        // 1. Remove from medicines list
        this.state.medicines = this.state.medicines.filter(m => m.id !== medId);
        
        // 2. Remove from history (This ensures the adherence score is recalculated without this med)
        this.state.history = this.state.history.filter(h => h.medId !== medId);
        
        // 3. Save and Refresh everything
        this.saveState();
        this.renderMedicines();
        this.updateDashboard(); // Recalculates score
        this.renderHistory();
        this.renderInsights();
        this.runMissDetectionEngine();
    }
}

    getTodayDoses() {
        // Simplified: return all medicines. For MVP we don't strictly calculate alternate/weekly.
        return this.state.medicines;
    }

    renderMedicines() {
        const list = document.getElementById('medicines-list');
        list.innerHTML = '';
        
        const todayDoses = this.getTodayDoses();
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (todayDoses.length === 0) {
            list.innerHTML = `<p class="supportive-text text-center py-4">No medicines scheduled for today.</p>`;
            return;
        }

        let renderedCount = 0;

        todayDoses.forEach(med => {
            // Check if already logged today
            const loggedToday = this.state.history.find(h => 
                h.medId === med.id && 
                h.date === todayStr
            );
            
            if (loggedToday) return; // Hide taken/missed ones from the main today's list, they go to history
            
            renderedCount++;
            const statusClass = this.getTimeWindowStatus(med.timing);

            const div = document.createElement('div');
            div.className = `medicine-item ${med.critical ? 'critical' : ''}`;
            
            let timeStr = '08:00 AM';
            if (med.timing === 'Afternoon') timeStr = '01:00 PM';
            if (med.timing === 'Evening') timeStr = '08:00 PM';

      div.innerHTML = `
    <div class="med-info">
        <h4>${med.name} ${med.critical ? '<i data-lucide="alert-circle" style="width:16px; color:var(--danger)"></i>' : ''}</h4>
        <p>${med.dosage}</p>
        <div class="med-time mt-3">
            <span class="med-status ${statusClass}"></span> ${timeStr}
        </div>
    </div>
    <div class="med-actions" style="display: flex; align-items: center; gap: 12px;">
        <div class="med-menu-container" style="position: relative;">
            <button class="btn-icon" onclick="app.toggleMedMenu(event, '${med.id}')" style="color: var(--text-light);">
                <i data-lucide="more-vertical"></i>
            </button>
            <div id="menu-${med.id}" class="med-dropdown" style="display: none; position: absolute; right: 0; top: 100%; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; min-width: 120px;">
                <button onclick="app.removeMedicine('${med.id}')" style="width: 100%; padding: 12px; text-align: left; color: var(--danger); border: none; background: none; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                    <i data-lucide="trash-2" style="width: 16px;"></i> Remove
                </button>
            </div>
        </div>
        
        <button class="btn-action take" style="height: 50px; width: 50px; display: flex; align-items: center; justify-content: center;" onclick="app.logDose('${med.id}', 'taken')" title="Take">
            <i data-lucide="check" style="width: 24px;"></i>
        </button>
    </div>

`;
`;
            `;
            list.appendChild(div);
        });

        if (renderedCount === 0) {
            list.innerHTML = `<p class="supportive-text text-center py-4 success-text"><i data-lucide="check-circle" style="margin-bottom:8px; display:inline-block;"></i><br>All caught up for today!</p>`;
        }

        lucide.createIcons();
    }

    getTimeWindowStatus(timing) {
        const hour = new Date().getHours();
        let expectedHour = 8;
        if (timing === 'Afternoon') expectedHour = 13;
        if (timing === 'Evening') expectedHour = 20;

        const diff = hour - expectedHour;
        if (diff < -1) return 'status-pending'; // Future
        if (diff >= -1 && diff <= 1) return 'status-on-time'; // Window
        if (diff > 1 && diff <= 3) return 'status-near-miss'; // Warning
        return 'status-missed'; // Missed
    }

    logDose(medId, status) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Remove existing entry for today if exists
        this.state.history = this.state.history.filter(h => !(h.medId === medId && h.date === todayStr));
        
        this.state.history.push({
            id: this.generateId(),
            medId,
            status,
            date: todayStr,
            timestamp: new Date().toISOString()
        });
        
        this.saveState();
        this.renderMedicines();
        this.updateDashboard();
        this.renderHistory();
        this.runMissDetectionEngine();
    }

 updateDashboard() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Filter history for ONLY today's entries
    const todayHistory = this.state.history.filter(h => h.date === todayStr);
    
    // 2. Get total doses scheduled for today
    // This serves as the target for 100%
    const totalScheduledToday = this.getTodayDoses().length;

    // 3. Initial State & Empty State: 
    // If no medicines are listed OR no medicines have been checked yet
    if (totalScheduledToday === 0 || todayHistory.length === 0) {
        this.setAdherenceScore(0);
        this.renderMiniHeatmap();
        return;
    }

    // 4. Calculate progress
    // Only 'taken' status increases the score
    const takenToday = todayHistory.filter(h => h.status === 'taken').length;
    
    // 5. Final Percentage calculation
    const percentage = Math.round((takenToday / totalScheduledToday) * 100);
    
    // Ensure it doesn't exceed 100% (safety check)
    const finalScore = Math.min(percentage, 100);
    
    this.setAdherenceScore(finalScore);
    this.renderMiniHeatmap();
}
  setAdherenceScore(percentage) {
    const circle = document.querySelector('.progress-circle');
    const text = document.querySelector('.progress-value');
    if (!circle || !text) return;

    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    text.textContent = `${percentage}%`;
    
    // Color transitions: Red -> Yellow -> Green
    if (percentage === 100) {
        circle.style.stroke = '#22C55E'; // Success Green
    } else if (percentage > 0) {
        circle.style.stroke = '#F59E0B'; // Progress Orange/Yellow
    } else {
        circle.style.stroke = '#EF4444'; // Initial/Empty Red
    }
}

    renderMiniHeatmap() {
    const container = document.getElementById('mini-heatmap');
    if (!container) return;
    container.innerHTML = '';
    
    const daysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday is 0 in JS
    const reorderedDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Monday-indexed for UI
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Get the date of the Monday of the current week
    const currentDayNum = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = now.getDate() - currentDayNum + (currentDayNum === 0 ? -6 : 1);
    const mondayDate = new Date(now.setDate(diffToMonday));

    // Generate dots for Mon through Sun
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        
        // Calculate status for that specific day
        const dayHistory = this.state.history.filter(h => h.date === dateStr);
        let status = 'pending';
        if (dayHistory.length > 0) {
            const hasMissed = dayHistory.some(h => h.status === 'missed');
            status = hasMissed ? 'missed' : 'taken';
        }

        // Create the wrapper for Dot + Label
        const dayWrapper = document.createElement('div');
        dayWrapper.className = `heatmap-day-wrapper ${isToday ? 'today-highlight' : ''}`;
        dayWrapper.style.display = 'flex';
        dayWrapper.style.flexDirection = 'column';
        dayWrapper.style.alignItems = 'center';
        dayWrapper.style.gap = '4px';

        dayWrapper.innerHTML = `
            <div class="heatmap-dot ${status}" title="${dateStr}" 
                 style="${isToday ? 'border: 2px solid var(--primary); transform: scale(1.2);' : ''}">
            </div>
            <span style="font-size: 10px; font-weight: ${isToday ? 'bold' : 'normal'}; 
                  color: ${isToday ? 'var(--primary)' : '#94A3B8'};">
                ${reorderedDays[i]}
            </span>
        `;
        
        container.appendChild(dayWrapper);
    }
}
    runMissDetectionEngine() {
        // Calculate consecutive misses
        let consecutiveMisses = 0;
        
        // Sort history descending
        const sortedHistory = [...this.state.history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        for (const record of sortedHistory) {
            if (record.status === 'missed') {
                consecutiveMisses++;
            } else if (record.status === 'taken') {
                break; // streak broken
            }
        }
        
        // Emotional Intelligence Layer
        const msgEl = document.getElementById('emotional-message');
        const lang = this.state.settings.language;
        const dict = window.translations[lang] || window.translations['en'];
        
        if (consecutiveMisses === 0) {
            msgEl.textContent = dict['emotional_perfect'] || "Perfect adherence! Keep it up.";
            msgEl.className = 'supportive-text success-text';
            document.getElementById('escalation-panel').style.display = 'none';
        } else if (consecutiveMisses === 1) {
            msgEl.textContent = dict['emotional_track'] || "Stay on track today.";
            msgEl.className = 'supportive-text warning-text';
            document.getElementById('escalation-panel').style.display = 'none';
        } else if (consecutiveMisses >= 2) {
            msgEl.textContent = dict['emotional_attention'] || "Evening doses need attention.";
            msgEl.className = 'supportive-text danger-text';
            
            // Escalation Panel
            const panel = document.getElementById('escalation-panel');
            panel.style.display = 'block';
            document.getElementById('escalation-message').textContent = `You have missed ${consecutiveMisses} consecutive doses.`;
            
            if (consecutiveMisses >= 3) {
                // Caregiver alert simulation
                document.getElementById('escalation-message').innerHTML = `You have missed ${consecutiveMisses} consecutive doses. <br><strong>Caregivers have been notified.</strong>`;
                panel.querySelector('.alert-content').classList.replace('warning', 'danger');
                panel.querySelector('i').classList.replace('warning-text', 'danger-text');
                panel.querySelector('h4').classList.replace('warning-text', 'danger-text');
            }
        }
        
        // Caregiver panel update
        if(document.getElementById('cg-total-missed')) {
            const missedTotal = this.state.history.filter(h => h.status === 'missed').length;
            document.getElementById('cg-total-missed').textContent = missedTotal;
            const risk = missedTotal >= 3 ? 'High' : (missedTotal > 0 ? 'Moderate' : 'Low');
            document.getElementById('cg-risk-level').textContent = risk;
            document.getElementById('cg-risk-level').className = risk === 'High' ? 'danger-text' : (risk === 'Moderate' ? 'warning-text' : 'success-text');
        }
    }

    renderHistory(filter = 'all') {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        
        const sorted = [...this.state.history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        const filtered = sorted.filter(h => filter === 'all' || h.status === filter);
        
        if (filtered.length === 0) {
            list.innerHTML = `<p class="supportive-text text-center py-4">No history records found.</p>`;
            return;
        }

        filtered.forEach(record => {
            const med = this.state.medicines.find(m => m.id === record.medId);
            const medName = med ? med.name : 'Unknown Medicine';
            const lang = this.state.settings.language;
            const dict = window.translations[lang] || window.translations['en'];
            const statusText = record.status === 'taken' ? dict['status_taken'] : dict['status_missed'];
            const colorClass = record.status === 'taken' ? 'success-text' : 'danger-text';
            const icon = record.status === 'taken' ? 'check-circle' : 'x-circle';
            
            const dateStr = new Date(record.timestamp).toLocaleString();

            const div = document.createElement('div');
            div.className = 'medicine-item';
            div.innerHTML = `
                <div class="med-info">
                    <h4>${medName}</h4>
                    <p>${dateStr}</p>
                </div>
                <div class="${colorClass}" style="display:flex; align-items:center; gap:6px; font-weight:600;">
                    <i data-lucide="${icon}" style="width:20px;"></i> ${statusText}
                </div>
            `;
            list.appendChild(div);
        });
        lucide.createIcons();
    }

    renderInsights() {
        const total = this.state.history.length;
        let percentage = 0;
        
        if (total > 0) {
            const taken = this.state.history.filter(h => h.status === 'taken').length;
            percentage = Math.round((taken / total) * 100);
            document.getElementById('insight-adherence').textContent = `${percentage}%`;
        } else {
            document.getElementById('insight-adherence').textContent = `--%`;
        }

        // Zone Status Logic
        let zone = 'Safe Zone';
        let zoneColor = 'var(--success)';
        let zoneBg = '#dcfce7'; // light green
        let zoneDesc = 'Great job! You are maintaining good adherence.';

        const missedCritical = this.state.history.some(h => {
            if (h.status === 'missed') {
                const m = this.state.medicines.find(med => med.id === h.medId);
                return m && m.critical;
            }
            return false;
        });

        if (missedCritical) {
            zone = 'Danger Zone';
            zoneColor = 'var(--danger)';
            zoneBg = '#fee2e2'; // light red
            zoneDesc = 'Critical medication missed! Please take it immediately.';
        } else if (percentage >= 70 || total === 0) {
            zone = 'Safe Zone';
            zoneColor = 'var(--success)';
            zoneBg = '#dcfce7';
            if (total === 0) zoneDesc = 'No history yet. Safe zone by default.';
            else zoneDesc = 'Great job! You are maintaining good adherence.';
        } else if (percentage >= 40) {
            zone = 'Medium Zone';
            zoneColor = 'var(--warning)';
            zoneBg = '#fef3c7'; // light orange
            zoneDesc = 'You are in the medium zone. Try to not miss your doses.';
        } else {
            zone = 'Danger Zone';
            zoneColor = 'var(--danger)';
            zoneBg = '#fee2e2';
            zoneDesc = 'Poor adherence! Please consult your doctor or caregiver.';
        }

        const zoneEl = document.getElementById('insight-zone');
        if (zoneEl) {
            zoneEl.textContent = zone;
            zoneEl.style.color = zoneColor;
            zoneEl.style.backgroundColor = zoneBg;
            const zoneDescEl = document.getElementById('insight-zone-desc');
            if (zoneDescEl) zoneDescEl.textContent = zoneDesc;
        }
        
        // Mock analytics
        const missedDoses = this.state.history.filter(h => h.status === 'missed');
        let mostMissedTime = 'None';
        if(missedDoses.length > 0) {
            // naive mock
            mostMissedTime = 'Evening';
        }
        document.getElementById('insight-missed-time').textContent = mostMissedTime;
        document.getElementById('insight-best-day').textContent = 'Today';

        // Bar Chart
        const chart = document.getElementById('bar-chart');
        chart.innerHTML = '';
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        days.forEach(day => {
            const height = Math.floor(Math.random() * 60) + 40; // Random mock data 40-100%
            const wrapper = document.createElement('div');
            wrapper.className = 'bar-wrapper';
            wrapper.innerHTML = `
                <div class="bar" style="height: ${height}%"></div>
                <div class="bar-label">${day}</div>
            `;
            chart.appendChild(wrapper);
        });
    }

    showContactModal() {
        document.getElementById('contact-modal').classList.add('active');
    }

    addContact() {
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        
        this.state.contacts.push({ id: this.generateId(), name, phone });
        this.saveState();
        
        document.getElementById('add-contact-form').reset();
        document.getElementById('contact-modal').classList.remove('active');
        this.renderContacts();
    }

    renderContacts() {
        const list = document.getElementById('contacts-list');
        list.innerHTML = '';
        
        if (this.state.contacts.length === 0) {
            list.innerHTML = `<p class="supportive-text text-center py-4">No emergency contacts added yet.</p>`;
        } else {
            this.state.contacts.forEach(contact => {
                const div = document.createElement('div');
                div.className = 'medicine-item';
                div.innerHTML = `
                    <div class="med-info" style="display:flex; align-items:center; gap:16px;">
                        <div class="profile-icon" style="width:40px; height:40px; font-size:16px; background:linear-gradient(135deg, var(--text-light), #94A3B8);"><i data-lucide="user"></i></div>
                        <div>
                            <h4>${contact.name}</h4>
                            <p>${contact.phone}</p>
                        </div>
                    </div>
                    <button class="btn-icon" style="color:var(--secondary);"><i data-lucide="phone"></i></button>
                `;
                list.appendChild(div);
            });
        }
        
        // Caregiver Mode Panel Toggle
        document.getElementById('caregiver-view-panel').style.display = this.state.settings.caregiverMode ? 'block' : 'none';
        
        lucide.createIcons();
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DawaSetuApp();
});
