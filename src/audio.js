export class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Master volumes for routing
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.3; // Quiet background music
    this.bgmGain.connect(this.ctx.destination);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.ctx.destination);
    
    this.isBgmMuted = false;
    this.isSfxMuted = false;
    
    this.bgmOscillators = [];
    this.bgmInterval = null;
    this.footstepInterval = null;
  }
  
  toggleBGM() {
    this.isBgmMuted = !this.isBgmMuted;
    this.bgmGain.gain.setTargetAtTime(this.isBgmMuted ? 0 : 0.3, this.ctx.currentTime, 0.1);
    return this.isBgmMuted;
  }

  toggleSFX() {
    this.isSfxMuted = !this.isSfxMuted;
    this.sfxGain.gain.setTargetAtTime(this.isSfxMuted ? 0 : 0.8, this.ctx.currentTime, 0.1);
    return this.isSfxMuted;
  }
  
  startBGM() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    if (this.bgmInterval) return; // already started
    
    // Simple ambient chord progression logic
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [349.23, 440.00, 523.25, 659.25], // Fmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];
    let chordIndex = 0;
    
    const playChord = () => {
      const chord = chords[chordIndex];
      chordIndex = (chordIndex + 1) % chords.length;
      
      this.bgmOscillators.forEach(osc => {
        try { osc.stop(); } catch(e){}
      });
      this.bgmOscillators = [];
      
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, this.ctx.currentTime);
        env.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 2);
        env.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 8);
        
        osc.connect(env);
        env.connect(this.bgmGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 8);
        this.bgmOscillators.push(osc);
      });
    };
    
    playChord();
    this.bgmInterval = setInterval(playChord, 8000);
  }
  
  startWalkingSound() {
    if (this.footstepInterval) return;
    this.playFootstep();
    // Match the CSS animation swing duration (0.6s full cycle, so step every 0.3s)
    this.footstepInterval = setInterval(() => this.playFootstep(), 300);
  }

  stopWalkingSound() {
    if (this.footstepInterval) {
      clearInterval(this.footstepInterval);
      this.footstepInterval = null;
    }
  }

  playFootstep() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // A quick low-frequency noise burst
    const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150; // Deep thud
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(1, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    
    noise.start();
  }

  playTVStatic() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5s
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, this.ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.2);
    env.gain.setValueAtTime(0.2, this.ctx.currentTime + 1.0);
    env.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    
    noise.start();
  }

  playPaperFlip() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.6, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    
    noise.start();
  }
}
