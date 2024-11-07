let currentStep = 1;
let items = [];

// Initialize dragula for each step
const drake2 = dragula([
    document.getElementById('unassignedValue'),
    document.getElementById('highValue'),
    document.getElementById('lowValue')
]);

const drake3 = dragula([
    document.getElementById('unassignedEffort'),
    document.getElementById('highEffort'),
    document.getElementById('lowEffort')
]);

// Handle enter key in input
document.getElementById('newItem').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addItem();
    }
});

function addItem() {
    const input = document.getElementById('newItem');
    const text = input.value.trim();
    
    if (text) {
        const item = {
            id: Date.now(),
            text: text,
            value: null,
            effort: null
        };
        items.push(item);
        
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = text;
        div.dataset.id = item.id;
        
        document.getElementById('itemsList').appendChild(div);
        input.value = '';
        
        // Also add to unassigned columns for next steps
        const valueClone = div.cloneNode(true);
        document.getElementById('unassignedValue').appendChild(valueClone);
        
        const effortClone = div.cloneNode(true);
        document.getElementById('unassignedEffort').appendChild(effortClone);
    }
}

function nextStep() {
    if (currentStep < 4) {
        document.querySelector(`#step${currentStep}`).classList.remove('active');
        document.querySelector(`#step${currentStep + 1}`).classList.add('active');
        
        // Update step indicators
        document.querySelectorAll('.step-number')[currentStep - 1].classList.remove('active');
        document.querySelectorAll('.step-number')[currentStep - 1].classList.add('completed');
        document.querySelectorAll('.step-number')[currentStep].classList.add('active');
        
        currentStep++;
        
        if (currentStep === 4) {
            categorizeItems();
        }
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
    }
}

function categorizeItems() {
    // Clear previous categorizations
    document.getElementById('quickWins').innerHTML = '';
    document.getElementById('strategic').innerHTML = '';
    document.getElementById('fillins').innerHTML = '';
    document.getElementById('timeSinks').innerHTML = '';
    
    // Get current categorizations
    const highValue = document.getElementById('highValue').getElementsByClassName('item');
    const lowValue = document.getElementById('lowValue').getElementsByClassName('item');
    const highEffort = document.getElementById('highEffort').getElementsByClassName('item');
    const lowEffort = document.getElementById('lowEffort').getElementsByClassName('item');
    
    // Create sets for easy lookup
    const highValueSet = new Set(Array.from(highValue).map(el => el.dataset.id));
    const lowValueSet = new Set(Array.from(lowValue).map(el => el.dataset.id));
    const highEffortSet = new Set(Array.from(highEffort).map(el => el.dataset.id));
    const lowEffortSet = new Set(Array.from(lowEffort).map(el => el.dataset.id));
    
    // Categorize all items
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = item.text;
        div.dataset.id = item.id;
        
        if (highValueSet.has(item.id.toString()) && lowEffortSet.has(item.id.toString())) {
            document.getElementById('quickWins').appendChild(div);
        } else if (highValueSet.has(item.id.toString()) && highEffortSet.has(item.id.toString())) {
            document.getElementById('strategic').appendChild(div);
        } else if (lowValueSet.has(item.id.toString()) && lowEffortSet.has(item.id.toString())) {
            document.getElementById('fillins').appendChild(div);
        } else if (lowValueSet.has(item.id.toString()) && highEffortSet.has(item.id.toString())) {
            document.getElementById('timeSinks').appendChild(div);
        }
    });
}

function exportData() {
    let csv = 'Category,Item\n';
    
    function processQuadrant(id, name) {
        const items = document.getElementById(id).getElementsByClassName('item');
        Array.from(items).forEach(item => {
            csv += `"${name}","${item.textContent}"\n`;
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
    a.setAttribute('download', 'prioritization-results.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function resetTool() {
    // Reset all variables and clear all containers
    items = [];
    currentStep = 1;
    
    // Clear all containers
    ['itemsList', 'unassignedValue', 'highValue', 'lowValue', 
     'unassignedEffort', 'highEffort', 'lowEffort',
     'quickWins', 'strategic', 'fillins', 'timeSinks'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    
    // Reset steps
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    
    // Reset step indicators
    document.querySelectorAll('.step-number').forEach(indicator => {
        indicator.classList.remove('active', 'completed');
    });
    document.querySelectorAll('.step-number')[0].classList.add('active');
}
