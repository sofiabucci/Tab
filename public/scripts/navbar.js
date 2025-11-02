/**
 * @file navbar.js
 * @description Navigation bar functionality and modal management
 * Handles modal opening/closing and user interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    /**
     * Modal mapping configuration
     * @type {Object}
     */
    const modalMap = {
        playBtn: 'setupModal',
        rulesBtn: 'rulesModal', 
        classBtn: 'classModal',
        loginBtn: 'loginModal'
    };

    /**
     * Initialize modal event listeners
     */
    function initializeModals() {
        for (const [btnId, modalId] of Object.entries(modalMap)) {
            const btn = document.getElementById(btnId);
            const modal = document.getElementById(modalId);

            if (btn && modal) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                    
                    if (btnId === 'classBtn' && window.classification) {
                        console.log('Opening classification modal - refreshing data');
                        window.classification.refreshDisplay();
                    }
                });
            }
        }
    }

    /**
     * Setup modal closing behavior
     */
    function setupModalClosing() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.add('hidden');
                }
            });
        });

        // Prevent modal content from closing parent
        document.querySelectorAll('.setup-container').forEach(container => {
            container.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
    }

    /**
     * Handle ESC key for modal closing
     */
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.add('hidden');
                });
            }
        });
    }

    // Initialize all navigation functionality
    initializeModals();
    setupModalClosing();
    setupKeyboardControls();
});