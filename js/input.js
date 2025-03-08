export class InputHandler {
    constructor() {
        this.keys = {};
        
        // Set up event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
    }
    
    handleKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
    }
} 