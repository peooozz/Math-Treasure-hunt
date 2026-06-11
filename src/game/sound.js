/**
 * Synthesizer Sound Module using Web Audio API (no external file dependencies)
 */
export const Sound = (() => {
    let ctx = null;

    function init() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playShoot() {
        init();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    }

    // Creepy high-frequency insect screech/hiss sound when firing
    function playScreech() {
        init();
        if (!ctx) return;

        const bufferSize = ctx.sampleRate * 0.35;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate high pass white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Bandpass sweeps to mimic animal screech
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(15, ctx.currentTime);
        filter.frequency.setValueAtTime(2500, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(4500, ctx.currentTime + 0.3);
        
        // Pitch oscillator modulation to create vibration/clicking hiss
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(45, ctx.currentTime);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(800, ctx.currentTime);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        
        // Connect modulation
        osc.connect(oscGain);
        oscGain.connect(filter.frequency);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        noise.start();
        
        osc.stop(ctx.currentTime + 0.35);
        noise.stop(ctx.currentTime + 0.35);
    }

    function playExplosion() {
        init();
        if (!ctx) return;
        
        const bufferSize = ctx.sampleRate * 0.45;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.45);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
        noise.stop(ctx.currentTime + 0.45);
    }

    function playPickup() {
        init();
        if (!ctx) return;
        
        const time = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + idx * 0.05);
            
            gain.gain.setValueAtTime(0.12, time + idx * 0.05);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.05 + 0.15);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(time + idx * 0.05);
            osc.stop(time + idx * 0.05 + 0.15);
        });
    }

    function playDamage() {
        init();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }

    function playGravityFlip() {
        init();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.5);
        
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(8, ctx.currentTime);
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }

    function playJump() {
        init();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }

    function playUnlock() {
        init();
        if (!ctx) return;
        
        const time = ctx.currentTime;
        const notes = [587.33, 739.99, 880.00, 1174.66];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time + idx * 0.08);
            
            gain.gain.setValueAtTime(0.18, time + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.08 + 0.25);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(time + idx * 0.08);
            osc.stop(time + idx * 0.08 + 0.25);
        });
    }

    function playDeath() {
        init();
        if (!ctx) return;
        
        const time = ctx.currentTime;
        const notes = [220, 160, 100, 60];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time + idx * 0.12);
            
            gain.gain.setValueAtTime(0.2, time + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.12 + 0.22);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(time + idx * 0.12);
            osc.stop(time + idx * 0.12 + 0.22);
        });
    }

    function playVictory() {
        init();
        if (!ctx) return;
        
        const time = ctx.currentTime;
        const notes = [293.66, 369.99, 440.00, 587.33, 739.99, 880.00, 1174.66];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time + idx * 0.08);
            
            gain.gain.setValueAtTime(0.15, time + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, time + idx * 0.08 + 0.35);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(time + idx * 0.08);
            osc.stop(time + idx * 0.08 + 0.35);
        });
    }

    return {
        init,
        playShoot,
        playScreech,
        playExplosion,
        playPickup,
        playDamage,
        playGravityFlip,
        playJump,
        playUnlock,
        playDeath,
        playVictory
    };
})();
