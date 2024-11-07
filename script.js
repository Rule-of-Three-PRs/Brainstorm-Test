import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, runTransaction } from 'firebase/database';

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyC_VSMqIXDaeEaVedPrjxCTm6ZYtWwkR68",
    authDomain: "prioritize-7451e.firebaseapp.com",
    projectId: "prioritize-7451e",
    storageBucket: "prioritize-7451e.firebasestorage.app",
    messagingSenderId: "277955967811",
    appId: "1:277955967811:web:eef30a3cc83aa104ba0df6",
    measurementId: "G-Z9RD172YPC"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Generate or get session ID
const sessionId = new URLSearchParams(window.location.search).get('session') || Date.now().toString(36);

// Initialize all real-time features
document.addEventListener('DOMContentLoaded', () => {
    initializeLockManagement();
    initializeRealtimeUpdates();
    initializePresence();
    
    // Update URL with session ID if not present
    if (!window.location.search.includes('session')) {
        window.history.pushState({}, '', `?session=${sessionId}`);
    }
    
    // Display session ID
    document.getElementById('sessionId').textContent = sessionId;
});

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyC_VSMqIXDaeEaVedPrjxCTm6ZYtWwkR68",
    authDomain: "prioritize-7451e.firebaseapp.com",
    projectId: "prioritize-7451e",
    storageBucket: "prioritize-7451e.firebasestorage.app",
    messagingSenderId: "277955967811",
    appId: "1:277955967811:web:eef30a3cc83aa104ba0df6",
    measurementId: "G-Z9RD172YPC"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>



// Conflict resolution and item locking system
let lockedItems = {};
let lastSyncTimestamp = Date.now();
const LOCK_TIMEOUT = 30000; // 30 seconds

// Initialize lock management
function initializeLockManagement() {
    const locksRef = ref(db, `sessions/${sessionId}/locks`);
    
    // Listen for lock changes
    onValue(locksRef, (snapshot) => {
        lockedItems = snapshot.val() || {};
        updateLockedItemsDisplay();
    });

    // Clean up expired locks periodically
    setInterval(cleanExpiredLocks, 5000);
}

// Lock an item before editing
async function lockItem(itemId) {
    const lockRef = ref(db, `sessions/${sessionId}/locks/${itemId}`);
    const currentTime = Date.now();

    try {
        // Try to acquire lock using transaction
        const result = await runTransaction(lockRef, (currentLock) => {
            if (currentLock === null || 
                currentLock.timestamp + LOCK_TIMEOUT < currentTime ||
                currentLock.userId === userId) {
                return {
                    userId: userId,
                    userName: userName,
                    timestamp: currentTime
                };
            }
            // Abort if locked by someone else
            return undefined;
        });

        if (result.committed) {
            // Lock acquired
            showNotification(`You've locked "${getItemText(itemId)}" for editing`);
            return true;
        } else {
            // Lock failed
            const currentLock = result.snapshot.val();
            showNotification(`Item is being edited by ${currentLock.userName}`);
            return false;
        }
    } catch (error) {
        console.error('Lock acquisition failed:', error);
        return false;
    }
}

// Release a lock
async function unlockItem(itemId) {
    const lockRef = ref(db, `sessions/${sessionId}/locks/${itemId}`);
    
    try {
        // Only remove if it's our lock
        await runTransaction(lockRef, (currentLock) => {
            if (currentLock && currentLock.userId === userId) {
                return null;
            }
            return currentLock;
        });
        
        showNotification(`Released lock on "${getItemText(itemId)}"`);
    } catch (error) {
        console.error('Lock release failed:', error);
    }
}

// Clean up expired locks
async function cleanExpiredLocks() {
    const locksRef = ref(db, `sessions/${sessionId}/locks`);
    const currentTime = Date.now();

    try {
        const snapshot = await get(locksRef);
        const locks = snapshot.val() || {};

        for (const [itemId, lock] of Object.entries(locks)) {
            if (lock.timestamp + LOCK_TIMEOUT < currentTime) {
                // Remove expired lock
                await set(ref(db, `sessions/${sessionId}/locks/${itemId}`), null);
            }
        }
    } catch (error) {
        console.error('Lock cleanup failed:', error);
    }
}

// Conflict resolution for simultaneous edits
function resolveConflict(itemId, localChanges, remoteChanges) {
    const conflictRef = ref(db, `sessions/${sessionId}/conflicts/${itemId}`);
    
    // Store both versions
    set(conflictRef, {
        local: {
            userId: userId,
            userName: userName,
            changes: localChanges,
            timestamp: Date.now()
        },
        remote: remoteChanges
    });

    // Show conflict resolution dialog
    showConflictDialog(itemId, localChanges, remoteChanges);
}

// Update items with conflict checking
async function updateItem(itemId, newData) {
    const itemRef = ref(db, `sessions/${sessionId}/items/${itemId}`);
    
    try {
        // Get the latest version first
        const snapshot = await get(itemRef);
        const currentData = snapshot.val();

        if (currentData.lastModified > lastSyncTimestamp) {
            // Conflict detected
            resolveConflict(itemId, newData, currentData);
            return false;
        }

        // No conflict, update the item
        await set(itemRef, {
            ...newData,
            lastModified: Date.now()
        });
        
        lastSyncTimestamp = Date.now();
        return true;
    } catch (error) {
        console.error('Update failed:', error);
        return false;
    }
}

// Modify drag and drop to respect locks
drake2.on('drag', (el) => {
    const itemId = el.dataset.id;
    
    if (isItemLocked(itemId)) {
        drake2.cancel(true);
        showNotification(`Can't move - item is being edited by ${lockedItems[itemId].userName}`);
    }
});

// Update UI to show locked items
function updateLockedItemsDisplay() {
    document.querySelectorAll('.item').forEach(item => {
        const itemId = item.dataset.id;
        const lockInfo = lockedItems[itemId];
        
        item.classList.remove('locked', 'locked-by-me');
        item.querySelector('.lock-indicator')?.remove();

        if (lockInfo) {
            const isMyLock = lockInfo.userId === userId;
            item.classList.add(isMyLock ? 'locked-by-me' : 'locked');
            
            const lockIndicator = document.createElement('div');
            lockIndicator.className = 'lock-indicator';
            lockIndicator.title = isMyLock ? 
                'Locked by you' : 
                `Locked by ${lockInfo.userName}`;
            
            item.appendChild(lockIndicator);
        }
    });
}

// Add these CSS styles
const styles = `
    .item.locked {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .item.locked-by-me {
        border: 2px solid #4caf50;
    }

    .lock-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 16px;
        height: 16px;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23666" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>');
    }

    .conflict-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
    }

    .conflict-dialog .options {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }
`;
