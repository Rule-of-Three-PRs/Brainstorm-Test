// Make db globally available
let db;

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

// Test database connection
console.log("Testing database connection...");
const dbRef = db.ref();
dbRef.child('test').get()
    .then(() => console.log('Database connected successfully'))
    .catch(error => console.error('Database connection error:', error));

// Global Variables
let currentStep = 1;
let items = [];
let userName = localStorage.getItem('userName');
const userId = localStorage.getItem('userId') || generateUserId();
const sessionId = new URLSearchParams(window.location.search).get('session') || Date.now().toString(36);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update URL with session ID if not present
    if (!window.location.search.includes('session')) {
        window.history.pushState({}, '', `?session=${sessionId}`);
    }
    
    // Display session ID
    document.getElementById('sessionId').textContent = sessionId;
    
    // Get username if not set
    if (!userName) {
        userName = prompt('Enter your name for collaboration:') || 'Anonymous User';
        localStorage.setItem('userName', userName);
        localStorage.setItem('userId', userId);
    }

    // Initialize Firebase listeners
    initializeRealtimeUpdates();
    initializePresence();
    
    // Initialize Dragula for drag and drop
    initializeDragAndDrop();
    
    // Add enter key listener for new items
    document.getElementById('newItem').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addItem();
        }
    });
});

// Initialize real-time updates
function initializeRealtimeUpdates() {
    const itemsRef = db.ref(`sessions/${sessionId}/items`);
    const categoriesRef = db.ref(`sessions/${sessionId}/categories`);

    // Listen for items changes
    itemsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            items = Object.values(data);
            updateItemsDisplay();
        }
    });

    // Listen for category changes
    categoriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateCategoriesDisplay(data);
        }
    });
}

// Initialize user presence
function initializePresence() {
    const presenceRef = db.ref(`sessions/${sessionId}/users/${userId}`);
    const userInfo = {
        name: userName,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        active: true
    };

    // Update presence when user connects/disconnects
    db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            // Remove user data when they disconnect
            presenceRef.onDisconnect().remove();
            presenceRef.set(userInfo);
        }
    });

    // Listen for other users
    db.ref(`sessions/${sessionId}/users`).on('value', (snapshot) => {
        updateActiveUsers(snapshot.val());
    });
}

// Initialize drag and drop
function initializeDragAndDrop() {
    // Step 2: Business Value categorization
    dragula([
        document.querySelector('#unassignedValue .items-list'),
        document.querySelector('#highValue .items-list'),
        document.querySelector('#lowValue .items-list')
    ]).on('drop', (el, target) => {
        updateItemCategory(el.dataset.id, target.parentElement.id);
    });

    // Step 3: Implementation Effort categorization
    dragula([
        document.querySelector('#unassignedEffort .items-list'),
        document.querySelector('#highEffort .items-list'),
        document.querySelector('#lowEffort .items-list')
    ]).on('drop', (el, target) => {
        updateItemCategory(el.dataset.id, target.parentElement.id);
    });
}

// Utility Functions
function generateUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
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
// Item Management Functions
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

        // Save to Firebase
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

function updateItemsDisplay() {
    // Update items in current step
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

// Navigation Functions
function nextStep() {
    if (currentStep < 4) {
        document.querySelector(`#step${currentStep}`).classList.remove('active');
        document.querySelector(`#step${currentStep + 1}`).classList.add('active');
        
        // Update step indicators
        document.querySelectorAll('.step-number')[currentStep - 1].classList.remove('active');
        document.querySelectorAll('.step-number')[currentStep - 1].classList.add('completed');
        document.querySelectorAll('.step-number')[currentStep].classList.add('active');
        
        currentStep++;
        updateItemsDisplay();
    }
}

function previousStep() {
    if (currentStep > 1) {
        document.querySelector(`#step${currentStep}`).classList.remove('active');
        document.querySelector(`#step${currentStep - 1}`).classList.add('active');
        
        // Update step indicators
        document.querySelectorAll('.step-number')[currentStep - 1].classList.remove('active');
        document.querySelectorAll('.step-number')[currentStep - 2].classList.remove('completed');
        document.querySelectorAll('.step-number')[currentStep - 2].classList.add('active');
        
        currentStep--;
        updateItemsDisplay();
    }
}

// Display Functions
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
    // Clear all quadrants
    ['quickWins', 'strategic', 'fillins', 'timeSinks'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    
    // Categorize items into quadrants
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

// Export Function
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

// Copy Session Link Function
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

// Reset Function
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
