const GEMINI_API_KEY = "AIzaSyC0lSZ-0tp-4skwHYvuid5wCfsT1je6XVY";

async function callGemini(promptText, profile) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') return null;
    try {
        let systemCtx = `You are Apointee, a friendly AI Health & Wellness Assistant. Keep responses short, empathetic, and use bullet points.`;
        if (profile) {
            systemCtx += ` Note the user's profile - Age: ${profile.age}, Lifestyle: ${profile.lifestyle}, Conditions: ${profile.conditions.join(',') || 'none'}, Allergies: ${profile.allergies.join(',') || 'none'}. Avoid recommending anything that conflicts with their allergies or conditions.`;
        }
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemCtx }] },
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });
        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
    }
    return null;
}

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

    // --- Fake Backend State ---
    let userProfile = null;
    let profileOnboardingState = 'NOT_STARTED'; // 'NOT_STARTED', 'WAITING_FOR_NAME', 'WAITING_FOR_AGE', 'WAITING_FOR_LIFESTYLE', 'WAITING_FOR_ALLERGIES', 'WAITING_FOR_CONDITIONS', 'COMPLETED'
    let tempProfile = {
        name: "",
        age: null,
        lifestyle: "moderate",
        allergies: [],
        conditions: []
    };

    let reminders = [];
    let pendingReminder = null;

    function parseTime(text) {
        const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (match) {
            let h = parseInt(match[1]);
            let m = match[2] ? parseInt(match[2]) : 0;
            let ampm = match[3] ? match[3].toLowerCase() : null;
            if (ampm === 'pm' && h < 12) h += 12;
            if (ampm === 'am' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        return null;
    }

    async function fakeBackendRequest(userText) {
        if (userText.toLowerCase() === 'reset') {
            userProfile = null;
            profileOnboardingState = 'NOT_STARTED';
            tempProfile = { name: "", age: null, lifestyle: "moderate", allergies: [], conditions: [] };
            pendingReminder = null;
            reminders = [];
            return { type: "reset", message: "Profile has been reset. How can I help you?" };
        }

        if (!userProfile) {
            if (profileOnboardingState === 'NOT_STARTED') {
                profileOnboardingState = 'WAITING_FOR_NAME';
                return {
                    type: "need_profile",
                    message: "Hey! Before we get started, I’d like to know you better 😊\n\nWhat is your name?"
                };
            } else if (profileOnboardingState === 'WAITING_FOR_NAME') {
                const nameMatch = userText.match(/I(?:'m| am)?\s+([A-Z][a-z]+)/i) || userText.match(/(?:my name is|name is)\s+([A-Z][a-z]+)/i);
                if (nameMatch) {
                    tempProfile.name = nameMatch[1];
                } else {
                    const words = userText.split(/\s+/);
                    for(let w of words) {
                        if(/^[A-Z][a-z]+$/.test(w) && !['I', "I'm", "My"].includes(w)) {
                            tempProfile.name = w;
                            break;
                        }
                    }
                    if (!tempProfile.name && words.length > 0) {
                        let w = words[0];
                        tempProfile.name = w.charAt(0).toUpperCase() + w.slice(1);
                    }
                }
                
                if (!tempProfile.name) {
                    return { type: "need_more_info", message: "I didn't quite catch your name. Could you please provide it?" };
                }
                
                profileOnboardingState = 'WAITING_FOR_AGE';
                return {
                    type: "need_profile",
                    message: `Nice to meet you, ${tempProfile.name}! What is your age?`
                };
            } else if (profileOnboardingState === 'WAITING_FOR_AGE') {
                const ageMatch = userText.match(/(\d+)/);
                if (ageMatch) {
                    tempProfile.age = parseInt(ageMatch[1]);
                    profileOnboardingState = 'WAITING_FOR_LIFESTYLE';
                    return {
                        type: "need_profile",
                        message: `Got it! How would you describe your lifestyle (active / moderate / sedentary)?`
                    };
                } else {
                    return { type: "need_more_info", message: "I didn't quite catch your age. Could you please provide it as a number?" };
                }
            } else if (profileOnboardingState === 'WAITING_FOR_LIFESTYLE') {
                if (userText.toLowerCase().includes('active')) tempProfile.lifestyle = 'active';
                else if (userText.toLowerCase().includes('sedentary')) tempProfile.lifestyle = 'sedentary';
                else tempProfile.lifestyle = 'moderate';

                profileOnboardingState = 'WAITING_FOR_ALLERGIES';
                return {
                    type: "need_profile",
                    message: `Great. Do you have any allergies? (Type 'none' if you don't have any)`
                };
            } else if (profileOnboardingState === 'WAITING_FOR_ALLERGIES') {
                if (userText.toLowerCase().match(/(no|none|nothing|no allergies)/)) {
                    tempProfile.allergies = [];
                } else {
                    const allergyKw = ['dust', 'pollen', 'dairy', 'gluten', 'peanuts', 'penicillin'];
                    tempProfile.allergies = allergyKw.filter(k => userText.toLowerCase().includes(k));
                    if (tempProfile.allergies.length === 0) {
                        const aMatch = userText.match(/allergic to (\w+)/i);
                        if (aMatch) tempProfile.allergies.push(aMatch[1]);
                        else {
                            let items = userText.split(',').map(s => s.trim()).filter(Boolean);
                            tempProfile.allergies = items;
                        }
                    }
                }

                profileOnboardingState = 'WAITING_FOR_CONDITIONS';
                return {
                    type: "need_profile",
                    message: `Noted. Finally, do you have any existing health conditions? (Type 'none' if you don't have any)`
                };
            } else if (profileOnboardingState === 'WAITING_FOR_CONDITIONS') {
                if (userText.toLowerCase().match(/(no|none|nothing|no issues|no conditions)/)) {
                    tempProfile.conditions = [];
                } else {
                    const condKw = ['asthma', 'diabetes', 'hypertension', 'anxiety'];
                    tempProfile.conditions = condKw.filter(k => userText.toLowerCase().includes(k));
                    if(tempProfile.conditions.length === 0) {
                        const cMatch = userText.match(/(?:have|suffer from) ([a-z\s]+)(?:,|\.|\b)/i);
                        if(cMatch) {
                            if (!tempProfile.allergies.includes(cMatch[1].trim())) {
                                tempProfile.conditions.push(cMatch[1].trim());
                            }
                        } else {
                            let items = userText.split(',').map(s => s.trim()).filter(Boolean);
                            if(items.length > 0 && !items.every(i => tempProfile.allergies.includes(i))) {
                                tempProfile.conditions = items;
                            }
                        }
                    }
                }

                userProfile = tempProfile;
                profileOnboardingState = 'COMPLETED';
                return {
                    type: "profile_created",
                    profile: userProfile,
                    message: `Awesome ${userProfile.name}! Your health profile is ready ✅\n\nNow I can:\n• Give personalized remedies\n• Analyze your food\n• Help manage your health\n\nLet’s get started 🚀`
                };
            }
        }

        // Normal chat
        let botHTML = "";
        let templateId = null;
        let responseType = "normal";
        let doctorType = null;
        let docSlots = null;

        const lowerText = userText.toLowerCase();

        // If we have a pending reminder follow-up, handle that first (user is mid-conversation)
        if (pendingReminder) {
            // User is answering a follow-up question about medicine name or time
            let timeMatch = parseTime(userText);
            if (timeMatch) pendingReminder.time = timeMatch;

            if (!pendingReminder.medicine) {
                // They're giving us the medicine name
                let cleanName = userText.trim().replace(/[^a-zA-Z\s]/g, '').trim();
                if (cleanName.length > 0) {
                    let words = cleanName.split(/\s+/);
                    pendingReminder.medicine = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                }
            }
            if (!pendingReminder.time) {
                // They're giving us the time
                // parseTime already ran above, if still null, ask again
            }

            if (!pendingReminder.medicine) {
                return { type: "normal", message: "What is the medicine name?" };
            } else if (!pendingReminder.time) {
                return { type: "normal", message: `What time should I remind you to take ${pendingReminder.medicine}?` };
            }

            // Both available — save it
            const id = Date.now();
            reminders.push({ id, medicine: pendingReminder.medicine, time: pendingReminder.time, status: "pending" });

            let [rh, rm] = pendingReminder.time.split(':');
            let rampm = rh >= 12 ? 'PM' : 'AM';
            rh = rh % 12 || 12;
            let rdisplayTime = `${rh}:${rm} ${rampm}`;

            botHTML = `Reminder set for ${pendingReminder.medicine} at ${rdisplayTime} ⏰\n\nI'll notify you on time.`;
            responseType = "reminder_set";

            // Sync to medication UI
            addMedToUI(pendingReminder.medicine, rdisplayTime);
            pendingReminder = null;
            return { type: responseType, message: botHTML };
        }

        const isReminder = (lowerText.includes('medicine') || lowerText.includes('remind') || lowerText.includes('medication'));
        const explicitAppt = lowerText.match(/(need doctor|book appointment|appointment|doctor)/);

        if (isReminder && !explicitAppt) {
            pendingReminder = { medicine: null, time: null };

            let timeMatch = parseTime(userText);
            if (timeMatch) pendingReminder.time = timeMatch;

            // Try to extract medicine name
            let ignoreWords = ['medicine', 'my', 'reminder', 'pill', 'reminders', 'for', 'take', 'add', 'a', 'the', 'some', 'any'];
            
            // 1. Look for patterns like "take <Med>" or "add <Med>"
            const medMatch = lowerText.match(/(?:take|for|add)\s+([a-zA-Z]+)/i);
            if (medMatch && !ignoreWords.includes(medMatch[1].toLowerCase())) {
                pendingReminder.medicine = medMatch[1].charAt(0).toUpperCase() + medMatch[1].slice(1);
            } 
            
            // 2. If nothing found, try to assume any capitalized word
            if (!pendingReminder.medicine) {
                let wMatch = userText.match(/\b([A-Z][a-z]+)\b/);
                if (wMatch && !['I', 'Remind', 'Set', 'Medicine', 'Please'].includes(wMatch[1])) {
                    pendingReminder.medicine = wMatch[1];
                }
            }

            // 3. Fallback: Extract from remaining text
            if (!pendingReminder.medicine) {
                let cleanText = lowerText.replace(/remind me|to take|my medicine|for|at|in|on|\d+|am|pm|:/gi, '').trim();
                let words = cleanText.split(/\s+/).filter(w => !ignoreWords.includes(w) && w.length > 2);
                if (words.length > 0) {
                    pendingReminder.medicine = words[0].charAt(0).toUpperCase() + words[0].slice(1);
                }
            }

            if (!pendingReminder.medicine && !pendingReminder.time) {
                return { type: "normal", message: "Please tell me the medicine name and the time you'd like to take it." };
            } else if (!pendingReminder.time) {
                return { type: "normal", message: `Got it. What time should I remind you to take ${pendingReminder.medicine}?` };
            } else if (!pendingReminder.medicine) {
                return { type: "normal", message: `I have the time set for ${pendingReminder.time}. What is the medicine name?` };
            }

            const id = Date.now();
            reminders.push({
                id: id,
                medicine: pendingReminder.medicine,
                time: pendingReminder.time,
                status: "pending"
            });

            let [h, m] = pendingReminder.time.split(':');
            let ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            let displayTime = `${h}:${m} ${ampm}`;

            botHTML = `Reminder set for ${pendingReminder.medicine} at ${displayTime} ⏰\n\nI'll notify you on time.`;
            responseType = "reminder_set";

            // Sync to medication UI
            addMedToUI(pendingReminder.medicine, displayTime);
            pendingReminder = null;

        } else {
            // Assess severity & classification
            let severity = "mild";
            if (explicitAppt || lowerText.match(/(severe|unbearable|bleeding|fainting|chest pain|heart attack|emergency|extreme)/)) {
                 severity = "serious";
            } else if (lowerText.match(/(persistent|worsening|dizzy|migraine|sharp|moderate)/)) {
                 severity = "moderate";
            }

            // Categorize issue
            let docType = "General Physician";
            let issueName = "health concern";
            if (lowerText.match(/(skin|rash|acne)/)) {
                docType = "Dermatologist"; issueName = "skin issue";
            } else if (lowerText.match(/(chest pain|heart|heart attack)/)) {
                docType = "Cardiologist"; issueName = "chest discomfort";
                severity = "serious"; // Heart is always serious
            } else if (lowerText.match(/(bones|injury|fracture|break)/)) {
                docType = "Orthopedic"; issueName = "bone or joint issue";
                severity = "serious";
            } else if (lowerText.match(/(stomach|digestion|belly|gas|bloating)/)) {
                docType = "Gastroenterologist"; issueName = "stomach discomfort";
            } else if (lowerText.match(/(headache|head ache)/)) {
                issueName = "headache";
            } else if (lowerText.match(/(cold|cough|sneeze|runny nose|fever)/)) {
                issueName = "cold or fever";
            }

            if (severity === "serious") {
                let tone = "I recommend consulting a";
                if (userProfile && userProfile.conditions && userProfile.conditions.length > 0) {
                    if (userProfile.conditions.some(c => c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('hypertension'))) {
                        tone = "Given your medical history, it's very important you consult a";
                    }
                }
                docSlots = ["10:00 AM Today", "2:00 PM Today", "11:30 AM Tomorrow", "5:00 PM Tomorrow"];
                
                let intro = explicitAppt ? `Based on your request, ${tone} ${docType} 👨‍⚕️` : `It seems like you're experiencing a serious issue.\n\n⚠️ Note:\n• Since you mentioned severe symptoms, please consult a doctor immediately. I cannot provide home remedies for this.\n\nBased on your symptoms, ${tone} ${docType} 👨‍⚕️`;

                botHTML = `${intro}\n\nHere are available slots:\n• 10:00 AM (Today)\n• 2:00 PM (Today)\n• 11:30 AM (Tomorrow)\n• 5:00 PM (Tomorrow)\n\nPlease select a slot to confirm your appointment.`;
                templateId = 'tpl-appointment-card';
                responseType = "appointment_options";
                doctorType = docType;
            } else if (severity === "moderate") {
                botHTML = `It seems like you're experiencing a moderate ${issueName}.\n\n🌿 Remedies:\n• Rest adequately and keep yourself hydrated.\n• Try observing if the issue subsides with over-the-counter care.\n\n💡 Tip:\n• Avoid strenuous activities for the next 24 hours.\n\n⚠️ Note:\n• Monitor your symptoms closely. If they worsen, please consult a ${docType}. Would you like me to book an appointment?`;
            } else if (lowerText.match(/(headache|cold|cough|stomach|skin|rash|acne|fever)/)) {
                // Mild specific issue
                let remedies = [];
                if (issueName === "headache") {
                    remedies = ["Drink a warm cup of ginger or peppermint tea.", "Massage your temples gently with some soothing balm."];
                } else if (issueName === "cold or fever") {
                    remedies = ["Drink warm turmeric milk (Haldi Doodh) before sleeping.", "Do steam inhalation with a few drops of eucalyptus oil to clear congestion."];
                } else if (issueName === "stomach discomfort") {
                    remedies = ["Chew on some roasted cumin seeds (Jeera) with warm water.", "Drink a soothing cup of ginger and lemon tea."];
                } else if (issueName === "skin issue") {
                    remedies = ["Apply some fresh aloe vera gel to soothe the area.", "Avoid touching it and keep it clean with mild soap."];
                } else {
                    remedies = ["Stay highly hydrated by drinking lukewarm water throughout the day.", "Take a brief 15-minute digital break and close your eyes to rest."];
                }

                if (userProfile) {
                    const conditions = (userProfile.conditions || []).map(c => c.toLowerCase());
                    const allergies = (userProfile.allergies || []).map(c => c.toLowerCase());
                    if (conditions.some(c => c.includes('diabetes')) && issueName === "cold or fever") {
                         remedies[0] = "Drink warm turmeric milk (Haldi Doodh) without any sugar or honey before sleeping.";
                    }
                    if (allergies.some(c => c.includes('dairy'))) {
                        remedies = remedies.map(r => r.replace("warm turmeric milk (Haldi Doodh)", "warm turmeric water"));
                    }
                }

                let tip = userProfile && userProfile.lifestyle === "sedentary" ? "Try to gently stretch for 5 minutes every couple of hours to improve circulation." : "Maintain your routine but ensure 7-8 hours of sound sleep.";

                botHTML = `It seems like you're experiencing a mild ${issueName}.\n\n🌿 Remedies:\n• ${remedies.join('\n• ')}\n\n💡 Tip:\n• ${tip}\n\n⚠️ Note:\n• If symptoms persist for more than 2 days, let me know and I can book an appointment.`;
            } else {
                // General conversation fallback via Gemini
                let geminiReply = null;
                if (GEMINI_API_KEY) {
                    geminiReply = await callGemini(userText, userProfile);
                }
                if (geminiReply) {
                    botHTML = geminiReply;
                } else {
                    botHTML = `I understand. Keeping your profile in mind (Age: ${userProfile ? userProfile.age : 'unknown'}, Lifestyle: ${userProfile ? userProfile.lifestyle : 'unknown'}), I'm here to support you. Would you like to read some resources on managing your health?`;
                }
            }
        }

        return { type: responseType, message: botHTML, templateId: templateId, doctor_type: doctorType, slots: docSlots };
    }

    function addMedToUI(medName, displayTime) {
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
                    <p>1 Pill &bull; ${displayTime}</p>
                </div>
            `;
            morningGrid.appendChild(newMedCard);
        }
    }

    function updateHealthHubUI(profile) {
        const nameDisplay = document.getElementById('user-name-display');
        if (nameDisplay) nameDisplay.textContent = profile.name;

        const sidebar = document.querySelector('.hub-sidebar');
        if (sidebar) {
            sidebar.innerHTML = `
                <div class="info-card profile-card" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px;"><i class="ph ph-user"></i> User Profile</h4>
                    <ul class="info-list" style="margin-bottom: 0;">
                        <li><strong>Name:</strong> ${profile.name}</li>
                        <li><strong>Age:</strong> ${profile.age}</li>
                        <li><strong>Lifestyle:</strong> <span style="text-transform: capitalize;">${profile.lifestyle}</span></li>
                    </ul>
                </div>
                
                <div class="info-card conditions-card" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px;"><i class="ph ph-heartbeat"></i> Conditions</h4>
                    <ul class="info-list">
                        ${profile.conditions.length > 0 ? profile.conditions.map(c => '<li><span class="dot orange"></span> ' + c + '</li>').join('') : '<li>None reported</li>'}
                    </ul>
                    <button class="add-info-btn"><i class="ph ph-plus"></i></button>
                </div>

                <div class="info-card allergies-card" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px;"><i class="ph ph-warning-circle"></i> Allergies</h4>
                    <ul class="info-list">
                        ${profile.allergies.length > 0 ? profile.allergies.map(a => '<li><span class="dot red"></span> ' + a + '</li>').join('') : '<li>None reported</li>'}
                    </ul>
                    <button class="add-info-btn"><i class="ph ph-plus"></i></button>
                </div>
            `;
        }
    }

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
        setTimeout(async () => {
            document.getElementById(typingId).remove();

            const response = await fakeBackendRequest(userText);
            let botHTML = response.message.replace(/\n/g, '<br>');
            let templateId = response.templateId || null;

            if (response.type === "profile_created") {
                updateHealthHubUI(response.profile);
                // Try to extract medicine name for next flow
                window._lastMedName = "Amlodipine 5mg"; 
            } else if (response.type === "normal" && templateId === 'tpl-medicine-card') {
                const words = userText.split(' ');
                const addIndex = words.findIndex(w => w === 'add');
                if (addIndex >= 0 && words.length > addIndex + 1) {
                    let endWords = ['to', 'for', 'remind', 'my', 'medicine', 'pill', 'reminders'];
                    let extracted = [];
                    for (let i = addIndex + 1; i < words.length; i++) {
                        if (endWords.includes(words[i])) break;
                        extracted.push(words[i]);
                    }
                    if (extracted.length > 0) {
                        let medName = extracted.join(' ');
                        window._lastMedName = medName.charAt(0).toUpperCase() + medName.slice(1);
                    }
                }
            }

            addBotMessage(botHTML, templateId, response);

            if (response.type === "profile_created") {
                setTimeout(() => {
                    document.querySelector('.nav-item[data-view="education"]').click();
                }, 1500); // Wait briefly before taking to hub
            }
        }, 1500);
    }

    function addBotMessage(htmlContent, templateId = null, backendResponse = null) {
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
                
                if (templateId === 'tpl-appointment-card' && backendResponse && backendResponse.type === 'appointment_options') {
                    extraContent = extraContent.replace('Cardiologist', backendResponse.doctor_type);
                    if (backendResponse.slots) {
                        const slotsHtml = backendResponse.slots.map((s, i) => `<button class="slot ${i === 0 ? 'selected' : ''}">${s}</button>`).join('');
                        extraContent = extraContent.replace(/<div class="time-slots">[\s\S]*?<\/div>/, `<div class="time-slots">${slotsHtml}</div>`);
                    }
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

                        // Parse time from text (e.g. "Tomorrow, 10:30 AM" or "10:30 AM Tomorrow")
                        let timeStr = slotText;
                        let targetDateIndex = 1; // Default
                        let lowerText = slotText.toLowerCase();

                        if (lowerText.includes('today')) {
                            targetDateIndex = 9; // Currently 9 is styling as active-day
                            timeStr = slotText.replace(/today/i, '').replace(/,/g, '').trim();
                        } else if (lowerText.includes('tomorrow')) {
                            targetDateIndex = 10;
                            timeStr = slotText.replace(/tomorrow/i, '').replace(/,/g, '').trim();
                        } else if (slotText.includes(',')) {
                            let parts = slotText.split(',');
                            timeStr = parts[1].trim();
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
                        let confirmTxt = '';
                        if (templateId === 'tpl-appointment-card') {
                            let dt = backendResponse && backendResponse.doctor_type ? backendResponse.doctor_type : 'Doctor';
                            confirmTxt = `Your appointment with a ${dt} is confirmed for ${slotText} ✅\n\nPlease arrive 10 minutes early.`;
                        } else {
                            confirmTxt = 'Reminder set successfully. The medication has been added to your Medication View.';
                        }
                        addBotMessage(`<p>${confirmTxt.replace(/\n/g, '<br>')}</p>`);
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

    // --- Background Scheduler for Reminders ---
    function checkReminders() {
        if (!userProfile) return; // Don't trigger if user isn't logged in
        
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${h}:${m}`;

        reminders.forEach(reminder => {
            if (reminder.time === currentTime && reminder.status === "pending") {
                reminder.status = "triggered"; // Prevent multiple triggers in the same minute
                sendNotification(reminder);
            }
        });
    }

    // Check every 10 seconds to avoid browser throttle missing a minute
    setInterval(checkReminders, 10000);

    window.sendNotification = function(reminder) {
        // Show notification badge or automatically switch to chat view
        const chatNav = document.querySelector('.nav-item[data-view="chat"]');
        if (!chatNav.classList.contains('active')) {
            chatNav.click();
        }

        const msgHTML = `⏰ Time to take your medicine: <strong>${reminder.medicine}</strong><br><br>Did you take it?`;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';
        
        const alertId = 'alert-' + reminder.id;
        msgDiv.innerHTML = `
            <div class="avatar-bot">
                <img src="https://imgs.search.brave.com/6ea6TNFL2zWfU6pVglVUCezpzxLvuP_b5hyPRvVaRBw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvcHJldmll/dy0xeC80NS84Mi9z/dGV0aG9zY29wZS13/aGl0ZS12ZWN0b3It/MzIxMDQ1ODIuanBn" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            </div>
            <div class="msg-content">
                ${msgHTML}
                <div class="interactive-card" id="${alertId}" style="margin-top: 10px; background: rgba(69, 182, 156, 0.1); border: 2px solid #45b69c; padding: 15px; border-radius: 16px;">
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-primary btn-yes" style="flex: 1; background: #45b69c;">Yes, I did</button>
                        <button class="btn-primary btn-no" style="flex: 1; background: #e11d48; color: white;">No</button>
                    </div>
                </div>
            </div>
        `;
        
        const chatHistory = document.getElementById('chat-messages');
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });

        const yesBtn = msgDiv.querySelector('.btn-yes');
        const noBtn = msgDiv.querySelector('.btn-no');

        yesBtn.addEventListener('click', () => {
            reminder.status = "taken";
            yesBtn.disabled = true;
            noBtn.style.display = 'none';
            yesBtn.textContent = 'Taken ✓';
            
            setTimeout(() => {
                const followUp = document.createElement('div');
                followUp.className = 'message bot';
                followUp.innerHTML = `<div class="avatar-bot"><img src="https://imgs.search.brave.com/6ea6TNFL2zWfU6pVglVUCezpzxLvuP_b5hyPRvVaRBw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvcHJldmll/dy0xeC80NS84Mi9z/dGV0aG9zY29wZS13/aGl0ZS12ZWN0b3It/MzIxMDQ1ODIuanBn" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>
                <div class="msg-content"><p>Great! Stay consistent 💪</p></div>`;
                chatHistory.appendChild(followUp);
                chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });
            }, 600);
        });

        noBtn.addEventListener('click', () => {
            reminder.status = "missed";
            noBtn.disabled = true;
            yesBtn.style.display = 'none';
            noBtn.textContent = 'Missed ✖';
            
            setTimeout(() => {
                const followUp = document.createElement('div');
                followUp.className = 'message bot';
                followUp.innerHTML = `<div class="avatar-bot"><img src="https://imgs.search.brave.com/6ea6TNFL2zWfU6pVglVUCezpzxLvuP_b5hyPRvVaRBw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvcHJldmll/dy0xeC80NS84Mi9z/dGV0aG9zY29wZS13/aGl0ZS12ZWN0b3It/MzIxMDQ1ODIuanBn" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>
                <div class="msg-content"><p>Try not to miss your doses. Your health matters ❤️</p></div>`;
                chatHistory.appendChild(followUp);
                chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });
            }, 600);
        });
    }

});
