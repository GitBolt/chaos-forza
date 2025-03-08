import * as THREE from 'three';

export class SoundManager {
    constructor() {
        // Create an audio listener
        this.listener = new THREE.AudioListener();
        
        // Create audio objects
        this.rocketSound = new THREE.Audio(this.listener);
        this.carSound = new THREE.Audio(this.listener);
        this.explosionSound = new THREE.Audio(this.listener);
        
        // Audio loader
        this.audioLoader = new THREE.AudioLoader();
        
        // Load sounds
        this.loadSounds();
    }
    
    loadSounds() {
        // Load rocket sound
        this.audioLoader.load('sound/rocket.mp3', (buffer) => {
            this.rocketSound.setBuffer(buffer);
            this.rocketSound.setLoop(false);
            this.rocketSound.setVolume(0.5);
        });
        
        // Load car sound
        this.audioLoader.load('sound/car.mp3', (buffer) => {
            this.carSound.setBuffer(buffer);
            this.carSound.setLoop(true);
            this.carSound.setVolume(0.3);
        });
        
        // Load explosion sound
        this.audioLoader.load('sound/explosion.mp3', (buffer) => {
            this.explosionSound.setBuffer(buffer);
            this.explosionSound.setLoop(false);
            this.explosionSound.setVolume(0.7);
        }, undefined, (error) => {
            console.warn('Failed to load explosion sound:', error);
            // Create a fallback explosion sound using oscillator
            this.createFallbackExplosionSound();
        });
    }
    
    createFallbackExplosionSound() {
        // Create a buffer for a simple explosion sound
        const context = this.listener.context;
        const sampleRate = context.sampleRate;
        const duration = 1; // 1 second
        const numChannels = 1;
        const length = sampleRate * duration;
        const buffer = context.createBuffer(numChannels, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate noise with decay for explosion effect
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const decay = Math.exp(-5 * t);
            data[i] = (Math.random() * 2 - 1) * decay;
        }
        
        // Set the buffer
        this.explosionSound.setBuffer(buffer);
    }
    
    playRocketSound() {
        if (this.rocketSound.isPlaying) {
            this.rocketSound.stop();
        }
        this.rocketSound.play();
    }
    
    playExplosionSound() {
        // Create a clone of the explosion sound to allow multiple explosions at once
        const explosionInstance = this.explosionSound.clone();
        explosionInstance.play();
        
        // Clean up the instance after it's done playing
        setTimeout(() => {
            explosionInstance.disconnect();
        }, 2000); // 2 seconds should be enough for most explosion sounds
    }
    
    updateCarSound(speed, isAccelerating, isBraking) {
        // Start the sound if it's not already playing and the car is moving
        if (!this.carSound.isPlaying && Math.abs(speed) > 0.1) {
            this.carSound.play();
        }
        
        // Stop the sound if the car is nearly stopped
        if (this.carSound.isPlaying && Math.abs(speed) < 0.1) {
            this.carSound.stop();
        }
        
        // If the sound is playing, adjust pitch and volume based on speed and acceleration
        if (this.carSound.isPlaying) {
            // Base pitch is 1.0
            let pitch = 0.5 + Math.abs(speed) / 4; // Adjust pitch based on speed
            
            // Increase pitch during acceleration
            if (isAccelerating) {
                pitch *= 1.2;
            }
            
            // Decrease pitch during braking
            if (isBraking) {
                pitch *= 0.8;
            }
            
            // Clamp pitch between reasonable values
            pitch = Math.max(0.5, Math.min(2.0, pitch));
            
            // Set the playback rate (pitch)
            this.carSound.setPlaybackRate(pitch);
            
            // Adjust volume based on speed
            const volume = 0.2 + Math.min(0.6, Math.abs(speed) / 4);
            this.carSound.setVolume(volume);
        }
    }
    
    dispose() {
        if (this.rocketSound) {
            this.rocketSound.stop();
        }
        if (this.carSound) {
            this.carSound.stop();
        }
        if (this.explosionSound) {
            this.explosionSound.stop();
        }
    }
} 