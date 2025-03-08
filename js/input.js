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
        
        // Set up mobile controls if on mobile device
        if (this.isMobile || window.innerWidth < 768) {
            this.setupMobileControls();
        } else {
            // Hide mobile controls on desktop
            document.addEventListener('DOMContentLoaded', () => {
                const mobileControls = document.getElementById('mobile-controls');
                if (mobileControls) {
                    mobileControls.style.display = 'none';
                }
            });
        }
        
        // Handle window resize to show/hide mobile controls
        window.addEventListener('resize', () => {
            const isMobileView = this.isMobile || window.innerWidth < 768;
            const mobileControls = document.getElementById('mobile-controls');
            
            if (mobileControls) {
                mobileControls.style.display = isMobileView ? 'block' : 'none';
            }
        });
    }
    
    handleKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
    }
    
    handleKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
    }
    
    setupMobileControls() {
        document.addEventListener('DOMContentLoaded', () => {
            // Get mobile control elements
            const joystickArea = document.getElementById('joystick-area');
            const joystick = document.getElementById('joystick');
            const fireButton = document.getElementById('fire-button');
            
            if (!joystickArea || !joystick || !fireButton) {
                console.error('Mobile control elements not found');
                return;
            }
            
            // Joystick variables
            const joystickAreaRect = joystickArea.getBoundingClientRect();
            const joystickAreaCenterX = joystickAreaRect.width / 2;
            const joystickAreaCenterY = joystickAreaRect.height / 2;
            const maxJoystickDistance = joystickAreaRect.width / 2 - joystick.offsetWidth / 2;
            
            // Joystick touch start event
            joystickArea.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleJoystickMove(e, joystickArea, joystick, joystickAreaCenterX, joystickAreaCenterY, maxJoystickDistance);
                this.joystickActive = true;
            });
            
            // Joystick touch move event
            joystickArea.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (this.joystickActive) {
                    this.handleJoystickMove(e, joystickArea, joystick, joystickAreaCenterX, joystickAreaCenterY, maxJoystickDistance);
                }
            });
            
            // Joystick touch end event
            joystickArea.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.resetJoystick(joystick, joystickAreaCenterX, joystickAreaCenterY);
                this.joystickActive = false;
                this.joystickPosition = { x: 0, y: 0 };
            });
            
            // Fire button touch events
            fireButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.fireButtonActive = true;
                this.keys[' '] = true; // Space key for firing
            });
            
            fireButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.fireButtonActive = false;
                this.keys[' '] = false;
            });
        });
    }
    
    handleJoystickMove(e, joystickArea, joystick, centerX, centerY, maxDistance) {
        const touch = e.touches[0];
        const joystickAreaRect = joystickArea.getBoundingClientRect();
        
        // Calculate touch position relative to joystick area
        const touchX = touch.clientX - joystickAreaRect.left;
        const touchY = touch.clientY - joystickAreaRect.top;
        
        // Calculate distance from center
        const deltaX = touchX - centerX;
        const deltaY = touchY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Normalize distance if it exceeds max distance
        const normalizedDistance = Math.min(distance, maxDistance);
        const angle = Math.atan2(deltaY, deltaX);
        
        // Calculate new joystick position
        const joystickX = centerX + normalizedDistance * Math.cos(angle);
        const joystickY = centerY + normalizedDistance * Math.sin(angle);
        
        // Update joystick position
        joystick.style.left = `${joystickX}px`;
        joystick.style.top = `${joystickY}px`;
        
        // Calculate normalized joystick position (-1 to 1)
        this.joystickPosition = {
            x: normalizedDistance * Math.cos(angle) / maxDistance,
            y: normalizedDistance * Math.sin(angle) / maxDistance
        };
        
        // Map joystick position to keyboard controls
        this.mapJoystickToKeys();
    }
    
    resetJoystick(joystick, centerX, centerY) {
        joystick.style.left = `${centerX}px`;
        joystick.style.top = `${centerY}px`;
        
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
} 