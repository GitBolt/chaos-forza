export class InputHandler {
    constructor() {
        this.keys = {};
        
        // Set up keyboard event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mobile control variables
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.joystickActive = false;
        this.joystickPosition = { x: 0, y: 0 };
        this.fireButtonActive = false;
        
        // Mobile controls elements
        this.joystickArea = null;
        this.joystick = null;
        this.fireButton = null;
        this.joystickAreaCenterX = 0;
        this.joystickAreaCenterY = 0;
        this.maxJoystickDistance = 0;
        
        // Debug elements
        this.debugInfo = null;
        this.debugStatus = null;
        
        // Initialize mobile controls
        this.initMobileControls();
        
        // Handle window resize to update mobile controls
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Enable debug mode with URL parameter ?debug=true
        this.debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
        if (this.debugMode) {
            this.enableDebugMode();
        }
    }
    
    handleKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
    }
    
    handleKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
    }
    
    handleResize() {
        const isMobileView = this.isMobile || window.innerWidth < 768;
        const mobileControls = document.getElementById('mobile-controls');
        
        if (mobileControls) {
            mobileControls.style.display = isMobileView ? 'block' : 'none';
        }
        
        // Update joystick dimensions if it exists
        if (this.joystickArea && this.joystick && isMobileView) {
            this.updateJoystickDimensions();
        }
    }
    
    initMobileControls() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupMobileControls();
            });
        } else {
            // DOM already loaded
            this.setupMobileControls();
        }
    }
    
    setupMobileControls() {
        // Get mobile control elements
        this.joystickArea = document.getElementById('joystick-area');
        this.joystick = document.getElementById('joystick');
        this.fireButton = document.getElementById('fire-button');
        
        if (!this.joystickArea || !this.joystick || !this.fireButton) {
            console.error('Mobile control elements not found');
            this.updateDebugStatus('Error: Mobile control elements not found');
            return;
        }
        
        // Show/hide mobile controls based on device/screen size
        const isMobileView = this.isMobile || window.innerWidth < 768;
        const mobileControls = document.getElementById('mobile-controls');
        
        if (mobileControls) {
            mobileControls.style.display = isMobileView ? 'block' : 'none';
        }
        
        // Update joystick dimensions
        this.updateJoystickDimensions();
        
        // Set up touch event listeners
        this.setupTouchEvents();
        
        // Log that mobile controls are initialized
        console.log('Mobile controls initialized:', isMobileView ? 'visible' : 'hidden');
        this.updateDebugStatus(`Mobile controls ${isMobileView ? 'visible' : 'hidden'} (${window.innerWidth}x${window.innerHeight})`);
    }
    
    updateJoystickDimensions() {
        const joystickAreaRect = this.joystickArea.getBoundingClientRect();
        this.joystickAreaCenterX = joystickAreaRect.width / 2;
        this.joystickAreaCenterY = joystickAreaRect.height / 2;
        this.maxJoystickDistance = joystickAreaRect.width / 2 - this.joystick.offsetWidth / 2;
        
        // Reset joystick position
        this.resetJoystick();
    }
    
    setupTouchEvents() {
        // Remove any existing event listeners to prevent duplicates
        this.joystickArea.removeEventListener('touchstart', this.handleJoystickStart);
        this.joystickArea.removeEventListener('touchmove', this.handleJoystickMove);
        this.joystickArea.removeEventListener('touchend', this.handleJoystickEnd);
        this.fireButton.removeEventListener('touchstart', this.handleFireStart);
        this.fireButton.removeEventListener('touchend', this.handleFireEnd);
        
        // Bind event handlers to this instance
        this.handleJoystickStart = this.handleJoystickStart.bind(this);
        this.handleJoystickMove = this.handleJoystickMove.bind(this);
        this.handleJoystickEnd = this.handleJoystickEnd.bind(this);
        this.handleFireStart = this.handleFireStart.bind(this);
        this.handleFireEnd = this.handleFireEnd.bind(this);
        
        // Add event listeners
        this.joystickArea.addEventListener('touchstart', this.handleJoystickStart, { passive: false });
        this.joystickArea.addEventListener('touchmove', this.handleJoystickMove, { passive: false });
        this.joystickArea.addEventListener('touchend', this.handleJoystickEnd, { passive: false });
        this.joystickArea.addEventListener('touchcancel', this.handleJoystickEnd, { passive: false });
        
        this.fireButton.addEventListener('touchstart', this.handleFireStart, { passive: false });
        this.fireButton.addEventListener('touchend', this.handleFireEnd, { passive: false });
        this.fireButton.addEventListener('touchcancel', this.handleFireEnd, { passive: false });
    }
    
    handleJoystickStart(e) {
        e.preventDefault();
        this.joystickActive = true;
        this.processJoystickTouch(e);
        this.updateDebugStatus('Joystick active');
    }
    
    handleJoystickMove(e) {
        e.preventDefault();
        if (this.joystickActive) {
            this.processJoystickTouch(e);
            if (this.debugMode) {
                this.updateDebugStatus(`Joystick: x=${this.joystickPosition.x.toFixed(2)}, y=${this.joystickPosition.y.toFixed(2)}`);
            }
        }
    }
    
    handleJoystickEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
        this.resetJoystick();
        this.joystickPosition = { x: 0, y: 0 };
        this.mapJoystickToKeys();
        this.updateDebugStatus('Joystick released');
    }
    
    handleFireStart(e) {
        e.preventDefault();
        this.fireButtonActive = true;
        this.keys[' '] = true; // Space key for firing
        this.updateDebugStatus('Fire button pressed');
    }
    
    handleFireEnd(e) {
        e.preventDefault();
        this.fireButtonActive = false;
        this.keys[' '] = false;
        this.updateDebugStatus('Fire button released');
    }
    
    processJoystickTouch(e) {
        if (!this.joystickArea || !this.joystick) return;
        
        const touch = e.touches[0];
        const joystickAreaRect = this.joystickArea.getBoundingClientRect();
        
        // Calculate touch position relative to joystick area
        const touchX = touch.clientX - joystickAreaRect.left;
        const touchY = touch.clientY - joystickAreaRect.top;
        
        // Calculate distance from center
        const deltaX = touchX - this.joystickAreaCenterX;
        const deltaY = touchY - this.joystickAreaCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Normalize distance if it exceeds max distance
        const normalizedDistance = Math.min(distance, this.maxJoystickDistance);
        const angle = Math.atan2(deltaY, deltaX);
        
        // Calculate new joystick position
        const joystickX = this.joystickAreaCenterX + normalizedDistance * Math.cos(angle);
        const joystickY = this.joystickAreaCenterY + normalizedDistance * Math.sin(angle);
        
        // Update joystick position
        this.joystick.style.left = `${joystickX}px`;
        this.joystick.style.top = `${joystickY}px`;
        
        // Calculate normalized joystick position (-1 to 1)
        this.joystickPosition = {
            x: normalizedDistance * Math.cos(angle) / this.maxJoystickDistance,
            y: normalizedDistance * Math.sin(angle) / this.maxJoystickDistance
        };
        
        // Map joystick position to keyboard controls
        this.mapJoystickToKeys();
    }
    
    resetJoystick() {
        if (!this.joystick) return;
        
        this.joystick.style.left = `${this.joystickAreaCenterX}px`;
        this.joystick.style.top = `${this.joystickAreaCenterY}px`;
        
        // Reset all movement keys
        this.keys['w'] = false;
        this.keys['a'] = false;
        this.keys['s'] = false;
        this.keys['d'] = false;
    }
    
    mapJoystickToKeys() {
        // Reset all movement keys
        this.keys['w'] = false;
        this.keys['a'] = false;
        this.keys['s'] = false;
        this.keys['d'] = false;
        
        // Forward/backward (Y-axis)
        if (this.joystickPosition.y < -0.3) {
            this.keys['w'] = true; // Forward
        } else if (this.joystickPosition.y > 0.3) {
            this.keys['s'] = true; // Backward
        }
        
        // Left/right (X-axis)
        if (this.joystickPosition.x < -0.3) {
            this.keys['a'] = true; // Left
        } else if (this.joystickPosition.x > 0.3) {
            this.keys['d'] = true; // Right
        }
    }
    
    enableDebugMode() {
        document.addEventListener('DOMContentLoaded', () => {
            this.debugInfo = document.getElementById('debug-info');
            this.debugStatus = document.getElementById('debug-status');
            
            if (this.debugInfo) {
                this.debugInfo.style.display = 'block';
                this.updateDebugStatus('Debug mode enabled');
            }
            
            // Add double tap to toggle debug info
            document.addEventListener('dblclick', () => {
                if (this.debugInfo) {
                    this.debugMode = !this.debugMode;
                    this.debugInfo.style.display = this.debugMode ? 'block' : 'none';
                }
            });
        });
    }
    
    updateDebugStatus(message) {
        if (this.debugStatus) {
            this.debugStatus.textContent = message;
        }
    }
} 