// ... (keep existing code and modify these functions) ...

function nextStep() {
    if (currentStep < 4) {
        const currentStepElement = document.querySelector(`#step${currentStep}`);
        const nextStepElement = document.querySelector(`#step${currentStep + 1}`);
        
        // Animate current step out
        currentStepElement.classList.add('exit');
        
        setTimeout(() => {
            currentStepElement.classList.remove('active', 'exit');
            nextStepElement.classList.add('active');
            
            // Update step indicators with animation
            const currentIndicator = document.querySelectorAll('.step-number')[currentStep - 1];
            const nextIndicator = document.querySelectorAll('.step-number')[currentStep];
            
            currentIndicator.classList.remove('active');
            currentIndicator.classList.add('completed');
            nextIndicator.classList.add('active');
            
            currentStep++;
            
            if (currentStep === 4) {
                setTimeout(() => {
                    document.querySelector('.matrix-container').classList.add('visible');
                }, 100);
                categorizeItems();
            }
        }, 400); // Match this with CSS animation duration
    }
}

function previousStep() {
    if (currentStep > 1) {
        const currentStepElement = document.querySelector(`#step${currentStep}`);
        const previousStepElement = document.querySelector(`#step${currentStep - 1}`);
        
        // Animate current step out
        currentStepElement.classList.add('exit');
        
        setTimeout(() => {
            currentStepElement.classList.remove('active', 'exit');
            previousStepElement.classList.add('active');
            
            // Update step indicators with animation
            const currentIndicator = document.querySelectorAll('.step-number')[currentStep - 1];
            const previousIndicator = document.querySelectorAll('.step-number')[currentStep - 2];
            
            currentIndicator.classList.remove('active');
            previousIndicator.classList.remove('completed');
            previousIndicator.classList.add('active');
            
            currentStep--;
        }, 400); // Match this with CSS animation duration
    }
}

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
        
        // Create item with animation
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = text;
        div.dataset.id = item.id;
        div.style.opacity = '0';
        
        document.getElementById('itemsList').appendChild(div);
        // Trigger reflow for animation
        div.offsetHeight;
        div.style.opacity = '1';
        
        input.value = '';
        
        // Clone for other columns
        const valueClone = div.cloneNode(true);
        const effortClone = div.cloneNode(true);
        
        document.getElementById('unassignedValue').appendChild(valueClone);
        document.getElementById('unassignedEffort').appendChild(effortClone);
    }
}

// Add this to enhance drag and drop animations
drake2.on('shadow', (el) => {
    el.classList.add('is-dragging');
});

drake2.on('dragend', (el) => {
    el.classList.remove('is-dragging');
    document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('drag-over');
    });
});

drake3.on('shadow', (el) => {
    el.classList.add('is-dragging');
});

drake3.on('dragend', (el) => {
    el.classList.remove('is-dragging');
    document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('drag-over');
    });
});
