document.addEventListener('DOMContentLoaded', () => {
    // Nav Navigation
    const navItems = document.querySelectorAll('.sidebar .nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            if (!targetView) return;

            // Update nav state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update view state
            views.forEach(view => view.classList.remove('active'));
            const viewEl = document.getElementById(`view-${targetView}`);
            if (viewEl) {
                viewEl.classList.add('active');
            }
        });
    });

    // Chat functionality
    const homeInput = document.getElementById('home-input');
    const mainChatInput = document.getElementById('main-chat-input');
    const chatHistory = document.getElementById('chat-messages');

    // Send from Home
    window.startChat = function (predefinedText = null) {
        const text = predefinedText || homeInput.value.trim();
        if (!text) return;

        homeInput.value = '';

        // Switch to chat view
        document.querySelector('.nav-item[data-view="chat"]').click();

        // Add user message
        addUserMessage(text);

        // Simulate bot reply
        simulateBotResponse(text);
    };

    homeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startChat();
    });

    // Send from Chat View
    document.getElementById('main-send-btn').addEventListener('click', () => {
        const text = mainChatInput.value.trim();
        if (!text) return;

        mainChatInput.value = '';
        addUserMessage(text);
        simulateBotResponse(text);
    });

    mainChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('main-send-btn').click();
        }
    });

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.textContent.trim();
            startChat(text);
        });
    });

    function addUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user';
        msgDiv.innerHTML = `
            <div class="msg-content">
                <p>${text}</p>
            </div>
        `;
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    }

    function simulateBotResponse(userText) {
        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = typingId;
        typingDiv.innerHTML = `
            <div class="avatar-bot"><img src="https://imgs.search.brave.com/6ea6TNFL2zWfU6pVglVUCezpzxLvuP_b5hyPRvVaRBw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvcHJldmll/dy0xeC80NS84Mi9z/dGV0aG9zY29wZS13/aGl0ZS12ZWN0b3It/MzIxMDQ1ODIuanBn" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>
            <div class="msg-content" style="padding: 0;">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatHistory.appendChild(typingDiv);
        scrollToBottom();

        // Delay for realism
        setTimeout(() => {
            document.getElementById(typingId).remove();

            userText = userText.toLowerCase();
            let botHTML = '';
            let templateId = null;

            if (userText.includes('book') || userText.includes('appointment')) {
                botHTML = `<p>I can help you schedule that right away. Here are the earliest available slots for Dr. Chen.</p>`;
                templateId = 'tpl-appointment-card';
            }
            else if (userText.includes('medicine') || userText.includes('pill') || userText.includes('remind') || userText.includes('add ')) {
                botHTML = `<p>I've pre-filled the details based on your request. Please confirm to set the reminder.</p>`;
                templateId = 'tpl-medicine-card';

                // Try to extract medicine name
                let medName = "Amlodipine 5mg"; // default
                const words = userText.split(' ');
                const addIndex = words.findIndex(w => w === 'add');
                if (addIndex >= 0 && words.length > addIndex + 1) {
                    let endWords = ['to', 'for', 'remind', 'my', 'medicine', 'pill', 'reminders'];
                    let extracted = [];
                    for (let i = addIndex + 1; i < words.length; i++) {
                        if (endWords.includes(words[i])) break;
                        extracted.push(words[i]);
                    }
                    if (extracted.length > 0) medName = extracted.join(' ');
                    // Capitalize
                    medName = medName.charAt(0).toUpperCase() + medName.slice(1);
                }
                window._lastMedName = medName;
            }
            else {
                botHTML = `<p>I understand. As your wellness assistant, I'm here to support you. Would you like to read some resources on managing your symptoms, or would you prefer to consult with a specialist?</p>`;
            }

            addBotMessage(botHTML, templateId);
        }, 1500);
    }

    function addBotMessage(htmlContent, templateId = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';

        let extraContent = '';
        if (templateId) {
            const template = document.getElementById(templateId);
            if (template) {
                extraContent = template.innerHTML;
                if (templateId === 'tpl-medicine-card' && window._lastMedName) {
                    extraContent = extraContent.replace('value="Amlodipine 5mg"', `value="${window._lastMedName}"`);
                }
            }
        }

        msgDiv.innerHTML = `
            <div class="avatar-bot"><img src="https://imgs.search.brave.com/6ea6TNFL2zWfU6pVglVUCezpzxLvuP_b5hyPRvVaRBw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvcHJldmll/dy0xeC80NS84Mi9z/dGV0aG9zY29wZS13/aGl0ZS12ZWN0b3It/MzIxMDQ1ODIuanBn" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>
            <div class="msg-content">
                ${htmlContent}
                ${extraContent}
            </div>
        `;
        chatHistory.appendChild(msgDiv);
        scrollToBottom();

        // Add events to new card buttons if any
        if (templateId) {
            msgDiv.querySelectorAll('.btn-primary').forEach(btn => {
                btn.addEventListener('click', function () {
                    this.textContent = 'Confirmed ✓';
                    this.style.background = '#45b69c'; // Green success color
                    this.disabled = true;

                    // If it's an appointment, add to calendar
                    if (templateId === 'tpl-appointment-card') {
                        // Extract selected doctor and slot
                        const selectedDoc = msgDiv.querySelector('.doc-item.selected strong');
                        const docName = selectedDoc ? selectedDoc.textContent : 'Doctor';
                        const selectedImg = msgDiv.querySelector('.doc-item.selected img');
                        const docImg = selectedImg ? selectedImg.src : 'https://i.pravatar.cc/100?img=12';

                        const selectedSlot = msgDiv.querySelector('.slot.selected');
                        const slotText = selectedSlot ? selectedSlot.textContent : '12:00 PM';

                        // Parse time from text (e.g. "Tomorrow, 10:30 AM" -> "10:30 AM")
                        let timeStr = slotText;
                        let targetDateIndex = 1; // Default

                        if (slotText.includes(',')) {
                            let parts = slotText.split(',');
                            timeStr = parts[1].trim();
                            let dayPart = parts[0].trim().toLowerCase();
                            if (dayPart === 'today') targetDateIndex = 9; // Currently 9 is styling as active-day
                            else if (dayPart === 'tomorrow') targetDateIndex = 10;
                            else targetDateIndex = 11;
                        }

                        // Add to correct day in calendar grid
                        const days = document.querySelectorAll('.main-cal-grid .day:not(.fade)');
                        if (days.length > 0) {
                            // Find the day block that has innerText equal to our targetDateIndex
                            let targetDayEl = null;
                            days.forEach(d => {
                                const span = d.querySelector('.date');
                                if (span && span.textContent.trim() == targetDateIndex) {
                                    targetDayEl = d;
                                }
                            });

                            if (targetDayEl) {
                                const newEvent = document.createElement('div');
                                newEvent.className = 'event-chip white';
                                newEvent.style.animation = 'slideUp 0.4s ease forwards';
                                newEvent.style.marginTop = '8px';
                                newEvent.innerHTML = `
                                    <span class="dot confirmed"></span> ${timeStr}
                                    <div class="event-title">New Appointment</div>
                                    <div class="event-user">
                                        <img src="${docImg}" alt="doc"> ${docName}
                                    </div>
                                `;
                                targetDayEl.appendChild(newEvent);
                            }
                        }
                    }
                    else if (templateId === 'tpl-medicine-card') {
                        // Extract medication info
                        const nameInput = msgDiv.querySelector('input[type="text"]');
                        const medNameCombo = nameInput ? nameInput.value : 'Medicine';
                        const parts = medNameCombo.split(' ');
                        const medName = parts[0];
                        const medDose = parts.slice(1).join(' ');

                        // Add to morning schedule list
                        const morningGrid = document.querySelector('#view-medication .schedule-block:first-child .med-cards-grid');
                        if (morningGrid) {
                            const newMedCard = document.createElement('div');
                            newMedCard.className = 'med-card';
                            newMedCard.style.animation = 'slideUp 0.4s ease forwards';
                            newMedCard.innerHTML = `
                                <div class="med-icon-top">
                                    <div class="icon-bg blue"><i class="ph-fill ph-pill"></i></div>
                                    <div class="check-circle"></div>
                                </div>
                                <div class="med-info">
                                    <h4>${medName}</h4>
                                    <p>${medDose || '1 Pill'} &bull; Daily scheduled</p>
                                </div>
                            `;
                            morningGrid.appendChild(newMedCard);
                        }
                    }

                    // Bot confirmation
                    setTimeout(() => {
                        let confirmTxt = templateId === 'tpl-appointment-card' ?
                            'Your appointment has been successfully scheduled. I will remind you 2 hours before.' :
                            'Reminder set successfully. The medication has been added to your Medication View.';
                        addBotMessage(`<p>${confirmTxt}</p>`);
                    }, 800);
                });
            });

            // Slot selection logic
            msgDiv.querySelectorAll('.slot').forEach(slot => {
                slot.addEventListener('click', function () {
                    msgDiv.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });
        }
    }

    function scrollToBottom() {
        chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }

    // --- File Upload Logic ---
    const fileInput = document.getElementById('global-file-input');
    const attachBtns = document.querySelectorAll('.action-btn .ph-paperclip');

    attachBtns.forEach(icon => {
        const btn = icon.closest('.action-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }
    });

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                const fileNames = files.map(f => f.name).join(', ');

                // Show as user message
                const msg = `Uploaded File(s): <strong>${fileNames}</strong>`;

                // Switch to chat view if not already there
                const chatNav = document.querySelector('.nav-item[data-view="chat"]');
                if (!chatNav.classList.contains('active')) {
                    chatNav.click();
                }

                addUserMessage(msg);

                // Clear the input
                fileInput.value = '';

                // Simulate bot confirming upload
                simulateBotResponse("I've securely received your document(s). Would you like me to analyze them and add any findings to your Health Hub?");
            }
        });
    }

    // --- New Appointment Button Logic ---
    const newAptBtn = document.querySelector('.new-apt-btn');
    if (newAptBtn) {
        newAptBtn.addEventListener('click', () => {
            if (window.startChat) {
                window.startChat("I need to book a new appointment");
            }
        });
    }

    // --- Speech to Text Logic ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        let currentInput = null;

        const micBtns = document.querySelectorAll('.action-btn .ph-microphone');

        micBtns.forEach(icon => {
            const btn = icon.closest('.action-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();

                    const inputWrapper = btn.closest('.chat-input-wrapper');
                    if (inputWrapper) {
                        currentInput = inputWrapper.querySelector('.chat-input');
                    }

                    if (btn.classList.contains('recording')) {
                        recognition.stop();
                    } else {
                        // Start animation
                        btn.classList.add('recording');
                        btn.style.color = '#e11d48'; // Red indicator
                        // If it has text (like the Voice btn on home), change color of text too
                        if (btn.classList.contains('has-text')) {
                            btn.style.color = '#e11d48';
                        }

                        try {
                            recognition.start();
                        } catch (err) {
                            console.error(err);
                        }
                    }
                });
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (currentInput) {
                currentInput.value = currentInput.value ? currentInput.value + ' ' + transcript : transcript;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopRecordingUI();

            if (event.error === 'not-allowed') {
                alert('Microphone access was denied. Please allow microphone access in your browser settings.');
            }
        };

        recognition.onend = () => {
            stopRecordingUI();
        };

        function stopRecordingUI() {
            document.querySelectorAll('.action-btn.recording').forEach(btn => {
                btn.classList.remove('recording');
                btn.style.color = '';
            });
        }
    } else {
        console.warn('Speech Recognition not supported in this browser.');
    }

});
