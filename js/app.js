// State Management
const defaultState = {
    user: null,
    medicines: [],
    history: [],
    contacts: [],
    settings: {
        language: 'en',
        elderlyMode: false,
        caregiverMode: false
    }
};

class DawaSetuApp {
    constructor() {
        this.state = JSON.parse(localStorage.getItem('dawasetu_state')) || defaultState;
        this.init();
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
        document.getElementById('lang-toggle').addEventListener('click', () => {
            this.state.settings.language = this.state.settings.language === 'en' ? 'hi' : 'en';
            this.applySettings();
            this.saveState();
        });

        document.getElementById('elder-toggle').addEventListener('click', () => {
            this.state.settings.elderlyMode = !this.state.settings.elderlyMode;
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

    applySettings() {
        // Elderly Mode
        if (this.state.settings.elderlyMode) {
            document.body.classList.add('elderly-mode');
            document.getElementById('elder-toggle').classList.add('active');
        } else {
            document.body.classList.remove('elderly-mode');
            document.getElementById('elder-toggle').classList.remove('active');
        }

        // Language
        document.querySelector('.lang-text').textContent = this.state.settings.language.toUpperCase();
        this.translateUI();
    }

    translateUI() {
        const lang = this.state.settings.language;
        const dict = window.translations[lang];
        
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
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === viewId) {
                item.classList.add('active');
                const titleKey = item.querySelector('span').getAttribute('data-i18n');
                document.getElementById('header-title').textContent = window.translations[this.state.settings.language][titleKey];
            }
        });

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
        this.state.user = `Guest_${guestId}`;
        this.saveState();
        this.showAppView();
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
        
        document.getElementById('greeting-text').textContent = window.translations[this.state.settings.language][greetingKey];
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
    
    toggleMainVoice() {
        const btn = document.getElementById('main-voice-btn');
        const text = document.getElementById('main-voice-text');
        if(!btn || !text) return;
        
        const isListening = btn.classList.contains('listening');
        
        if (isListening) {
            btn.classList.remove('listening');
            text.textContent = "Processing your voice command...";
            
            setTimeout(() => {
                text.innerHTML = '<i data-lucide="check-circle" style="color:#4ADE80; width:16px; display:inline-block; margin-bottom:-3px;"></i> Medicine logged successfully!';
                lucide.createIcons();
                
                setTimeout(() => {
                    text.textContent = 'Tap to speak. Try "Log my morning medicine"';
                }, 3000);
            }, 1500);
            
        } else {
            btn.classList.add('listening');
            text.textContent = "Listening to you...";
            
            // Auto stop after 4 seconds
            setTimeout(() => {
                if(btn.classList.contains('listening')) {
                    this.toggleMainVoice();
                }
            }, 4000);
        }
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
                <div class="med-actions">
                    <button class="btn-action take" onclick="app.logDose('${med.id}', 'taken')" title="Take">
                        <i data-lucide="check" style="width:20px;"></i>
                    </button>
                    <button class="btn-action miss" onclick="app.logDose('${med.id}', 'missed')" title="Miss">
                        <i data-lucide="x" style="width:20px;"></i>
                    </button>
                </div>
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
        const total = this.state.history.length;
        if (total === 0) {
            this.setAdherenceScore(0);
            return;
        }

        const taken = this.state.history.filter(h => h.status === 'taken').length;
        const percentage = Math.round((taken / total) * 100);
        
        this.setAdherenceScore(percentage);
        
        // Mini Heatmap
        this.renderMiniHeatmap();
    }

    setAdherenceScore(percentage) {
        const circle = document.querySelector('.progress-circle');
        const text = document.querySelector('.progress-value');
        
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        text.textContent = `${percentage}%`;
        
        // Update color based on score
        if (percentage >= 80) circle.style.stroke = 'var(--accent)';
        else if (percentage >= 50) circle.style.stroke = 'var(--warning)';
        else circle.style.stroke = 'var(--danger)';
    }

    renderMiniHeatmap() {
        const container = document.getElementById('mini-heatmap');
        container.innerHTML = '';
        
        // Generate last 7 days adherence
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            const dayHistory = this.state.history.filter(h => h.date === dateStr);
            let status = 'pending';
            
            if (dayHistory.length > 0) {
                const allTaken = dayHistory.every(h => h.status === 'taken');
                const hasMissed = dayHistory.some(h => h.status === 'missed');
                status = hasMissed ? 'missed' : 'taken';
            }
            
            const dot = document.createElement('div');
            dot.className = `heatmap-dot ${status}`;
            dot.title = dateStr;
            container.appendChild(dot);
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
        const dict = window.translations[this.state.settings.language];
        
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
            const dict = window.translations[this.state.settings.language];
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
        if (total === 0) return;

        const taken = this.state.history.filter(h => h.status === 'taken').length;
        const percentage = Math.round((taken / total) * 100);
        document.getElementById('insight-adherence').textContent = `${percentage}%`;
        
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
