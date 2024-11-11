// Global variables
let db;
let currentStep = 1;
let items = [];
let userName = localStorage.getItem('userName');
const userId = localStorage.getItem('userId') || generateUserId();
const sessionId = new URLSearchParams(window.location.search).get('session') || Date.now().toString(36);
let ignoreStepChange = false;

// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyC_VSMqIXDaeEaVedPrjxCTm6ZYtWwkR68",
    authDomain: "prioritize-7451e.firebaseapp.com",
    projectId: "prioritize-7451e",
    storageBucket: "prioritize-7451e.firebasestorage.app",
    messagingSenderId: "277955967811",
    appId: "1:277955967811:web:eef30a3cc83aa104ba0df6",
    measurementId: "G-Z9RD172YPC",
    databaseURL: "https://prioritize-7451e-default-rtdb.firebaseio.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
db = firebase.database();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update URL with session ID
    if (!window.location.search.includes('session')) {
        window.history.pushState({}, '', `?session=${sessionId}`);
    }
    
    // Get username if not set
    if (!userName) {
        userName = prompt('Enter your name for collaboration:') || 'Anonymous User';
        localStorage.setItem('userName', userName);
        localStorage.setItem('userId', userId);
    }

    document.getElementById('sessionId').textContent = sessionId;
    
    // Initialize all features
    initializeRealtimeUpdates();
    initializePresence();
    initializeDragAndDrop();
    initializeStepSync();
    
    // Add enter key listener
    document.getElementById('newItem').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addItem();
        }
    });
});

// Step Management Functions
function getStepName(stepNumber) {
    const steps = {
        1: "Brainstorming",
        2: "Business Value Assessment",
        3: "Implementation Effort Assessment",
        4: "Final Matrix"
    };
    return steps[stepNumber];
}

function validateStepChange(currentStep, newStep) {
    if (currentStep === 1) {
        const itemsList = document.getElementById('itemsList');
        if (!itemsList.children.length) {
            return "Add at least one item before proceeding to assessment.";
        }
    }

    if (currentStep === 2) {
        const unassigned = document.querySelector('#unassignedValue .items-list');
        if (unassigned.children.length > 0) {
            return "Please categorize all items by Business Value before proceeding.";
        }
    }

    if (currentStep === 3) {
        const unassigned = document.querySelector('#unassignedEffort .items-list');
        if (unassigned.children.length > 0) {
            return "Please categorize all items by Implementation Effort before proceeding.";
        }
    }

    return null;
}

function nextStep() {
    if (currentStep < 4) {
        const newStep = currentStep + 1;
        const validationError = validateStepChange(currentStep, newStep);
        
        if (validationError) {
            alert(validationError);
            return;
        }

        const confirmMessage = `Ready to move the entire team to "${getStepName(newStep)}"?\n\nMake sure everyone has completed their work in the current step.`;
        
        if (confirm(confirmMessage)) {
            db.ref(`sessions/${sessionId}/currentStep`).set({
                step: newStep,
                changedBy: userName,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        const newStep = currentStep - 1;
        const confirmMessage = `Ready to move the entire team back to "${getStepName(newStep)}"?\n\nThis will allow reassessment of previous categorizations.`;
        
        if (confirm(confirmMessage)) {
            db.ref(`sessions/${sessionId}/currentStep`).set({
                step: newStep,
                changedBy: userName,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }
}

function changeStep(newStep) {
    document.querySelector(`#step${currentStep}`).classList.remove('active');
    document.querySelector(`#step${newStep}`).classList.add('active');
    
    const indicators = document.querySelectorAll('.step-number');
    indicators[currentStep - 1].classList.remove('active');
    
    if (newStep > currentStep) {
        indicators[currentStep - 1].classList.add('completed');
    } else {
        indicators[currentStep - 1].classList.remove('completed');
    }
    
    indicators[newStep - 1].classList.add('active');
    currentStep = newStep;
    updateItemsDisplay();
}

// Initialize Functions
function initializeStepSync() {
    db.ref(`sessions/${sessionId}/currentStep`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.step && data.step !== currentStep) {
            ignoreStepChange = true;
            
            if (data.changedBy && data.changedBy !== userName) {
                showNotification(`${data.changedBy} moved the team to "${getStepName(data.step)}"`);
            }
            
            changeStep(data.step);
            ignoreStepChange = false;
        }
    });
}

function initializeRealtimeUpdates() {
    const itemsRef = db.ref(`sessions/${sessionId}/items`);
    
    itemsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            items = Object.values(data);
            updateItemsDisplay();
        }
    });
}

function initializePresence() {
    const presenceRef = db.ref(`sessions/${sessionId}/users/${userId}`);
    const userInfo = {
        name: userName,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        active: true
    };

    db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            presenceRef.onDisconnect().remove();
            presenceRef.set(userInfo);
        }
    });

    db.ref(`sessions/${sessionId}/users`).on('value', (snapshot) => {
        updateActiveUsers(snapshot.val());
    });
}

function initializeDragAndDrop() {
    dragula([
        document.querySelector('#unassignedValue .items-list'),
        document.querySelector('#highValue .items-list'),
        document.querySelector('#lowValue .items-list')
    ]).on('drop', (el, target) => {
        updateItemCategory(el.dataset.id, target.parentElement.id);
    });

    dragula([
        document.querySelector('#unassignedEffort .items-list'),
        document.querySelector('#highEffort .items-list'),
        document.querySelector('#lowEffort .items-list')
    ]).on('drop', (el, target) => {
        updateItemCategory(el.dataset.id, target.parentElement.id);
    });
}

// Item Management
function addItem() {
    const input = document.getElementById('newItem');
    const text = input.value.trim();
    
    if (text) {
        const newItem = {
            id: Date.now().toString(),
            text: text,
            createdBy: userName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            value: null,
            effort: null
        };

        db.ref(`sessions/${sessionId}/items/${newItem.id}`).set(newItem);
        input.value = '';
    }
}

function updateItemCategory(itemId, category) {
    const categoryType = category.includes('Value') ? 'value' : 'effort';
    const categoryValue = category.includes('high') ? 'high' : 'low';
    
    db.ref(`sessions/${sessionId}/items/${itemId}/${categoryType}`).set(categoryValue)
        .then(() => {
            if (currentStep === 4) {
                updateMatrix();
            }
        });
}

// Display Functions
function updateItemsDisplay() {
    switch(currentStep) {
        case 1:
            displayItemsInList();
            break;
        case 2:
            displayItemsInValueCategories();
            break;
        case 3:
            displayItemsInEffortCategories();
            break;
        case 4:
            updateMatrix();
            break;
    }
}

function displayItemsInList() {
    const container = document.getElementById('itemsList');
    container.innerHTML = '';
    
    items.forEach(item => {
        const div = createItemElement(item);
        container.appendChild(div);
    });
}

function displayItemsInValueCategories() {
    const unassigned = document.querySelector('#unassignedValue .items-list');
    const high = document.querySelector('#highValue .items-list');
    const low = document.querySelector('#lowValue .items-list');
    
    [unassigned, high, low].forEach(el => el.innerHTML = '');
    
    items.forEach(item => {
        const div = createItemElement(item);
        if (!item.value) {
            unassigned.appendChild(div);
        } else if (item.value === 'high') {
            high.appendChild(div);
        } else {
            low.appendChild(div);
        }
    });
}

function displayItemsInEffortCategories() {
    const unassigned = document.querySelector('#unassignedEffort .items-list');
    const high = document.querySelector('#highEffort .items-list');
    const low = document.querySelector('#lowEffort .items-list');
    
    [unassigned, high, low].forEach(el => el.innerHTML = '');
    
    items.forEach(item => {
        const div = createItemElement(item);
        if (!item.effort) {
            unassigned.appendChild(div);
        } else if (item.effort === 'high') {
            high.appendChild(div);
        } else {
            low.appendChild(div);
        }
    });
}

function updateMatrix() {
    ['quickWins', 'strategic', 'fillins', 'timeSinks'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    
    items.forEach(item => {
        if (item.value && item.effort) {
            const div = createItemElement(item);
            let quadrant;
            
            if (item.value === 'high' && item.effort === 'low') {
                quadrant = 'quickWins';
            } else if (item.value === 'high' && item.effort === 'high') {
                quadrant = 'strategic';
            } else if (item.value === 'low' && item.effort === 'low') {
                quadrant = 'fillins';
            } else {
                quadrant = 'timeSinks';
            }
            
            document.getElementById(quadrant).appendChild(div);
        }
    });
}

// Utility Functions
function generateUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
}

function createItemElement(item) {
    const div = document.createElement('div');
    div.className = 'item fade-in';
    div.dataset.id = item.id;
    div.innerHTML = `
        <span class="item-text">${item.text}</span>
        <span class="item-meta">Added by ${item.createdBy}</span>
    `;
    return div;
}

function updateActiveUsers(users) {
    const activeUsersEl = document.getElementById('activeUsers');
    activeUsersEl.innerHTML = '';
    
    if (users) {
        Object.entries(users).forEach(([id, user]) => {
            const avatarEl = document.createElement('div');
            avatarEl.className = 'user-avatar';
            avatarEl.title = user.name;
            avatarEl.textContent = user.name.charAt(0).toUpperCase();
            activeUsersEl.appendChild(avatarEl);
        });
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'step-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function copySessionLink() {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl)
        .then(() => {
            const button = document.querySelector('.copy-link-btn');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '#0066cc';
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy link:', err);
            alert('Failed to copy link. Please copy the URL manually.');
        });
}

function exportData() {
    let csv = 'Category,Item,Added By\n';
    
    function processQuadrant(id, name) {
        const items = document.getElementById(id).getElementsByClassName('item');
        Array.from(items).forEach(item => {
            const text = item.querySelector('.item-text').textContent;
            const addedBy = item.querySelector('.item-meta').textContent.replace('Added by ', '');
            csv += `"${name}","${text}","${addedBy}"\n`;
        });
    }
    
    processQuadrant('quickWins', 'Quick Wins');
    processQuadrant('strategic', 'Strategic Projects');
    processQuadrant('fillins', 'Fill-ins');
    processQuadrant('timeSinks', 'Time Sinks');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `prioritization-${sessionId}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function resetTool() {
    if (confirm('Are you sure you want to reset? All items will be cleared.')) {
        db.ref(`sessions/${sessionId}/items`).remove()
            .then(() => {
                items = [];
                currentStep = 1;
                document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
                document.getElementById('step1').classList.add('active');
                document.querySelectorAll('.step-number').forEach(indicator => {
                    indicator.classList.remove('active', 'completed');
                });
                document.querySelectorAll('.step-number')[0].classList.add('active');
                updateItemsDisplay();
            });
    }
}
