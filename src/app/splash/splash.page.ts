import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit, OnDestroy {
  @ViewChild('audioPlayer', { static: false }) audioPlayer!: ElementRef<HTMLAudioElement>;
  
  showFlash = true;
  showLogo = false;
  fadeOut = false;
  private audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;

  constructor(
    private router: Router,
    private platform: Platform
  ) {
    // Inisialisasi audio
    this.audio = new Audio();
    this.audio.src = 'assets/sounds/transisi.mp3';
    this.audio.preload = 'auto';
    this.audio.volume = 0.8;
    this.audio.muted = false;
    this.audio.load();
  }

  ngOnInit() {
    // Setup audio context untuk bypass autoplay policy
    this.setupAudioContext();
    
    // Tunggu platform siap
    this.platform.ready().then(() => {
      // Coba enable audio context dengan user gesture simulation
      this.enableAudioContext();
      
      // Delay sedikit untuk memastikan component sudah ter-render
      setTimeout(() => {
      this.showLogo = true;
      
      // Mainkan audio BERSAMAAN dengan munculnya logo
      setTimeout(() => {
        this.playSound();
      }, 50); // Sedikit delay untuk sinkronisasi
    }, 800); // Waktu munculnya logo

      // Mulai fade out sebelum navigasi
      setTimeout(() => {
        this.fadeOut = true;
      }, 4000);

      // Navigasi ke halaman login setelah fade out selesai
      setTimeout(() => {
        this.router.navigateByUrl('login', { replaceUrl: true });
      }, 5000);
    });
  }

  private setupAudioContext() {
    try {
      // Setup AudioContext untuk bypass autoplay restrictions
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load audio buffer
      fetch('assets/sounds/transisi.mp3')
        .then(response => response.arrayBuffer())
        .then(data => {
          if (this.audioContext) {
            return this.audioContext.decodeAudioData(data);
          }
          return Promise.reject('AudioContext not available');
        })
        .then(buffer => {
          this.audioBuffer = buffer;
          console.log('Audio buffer loaded successfully');
        })
        .catch(error => {
          console.log('Error loading audio buffer:', error);
        });
    } catch (error) {
      console.log('AudioContext setup failed:', error);
    }
  }

  private enableAudioContext() {
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('AudioContext resumed successfully');
        }).catch(error => {
          console.log('AudioContext resume failed:', error);
        });
      }
    } catch (error) {
      console.log('Enable AudioContext failed:', error);
    }
  }

  private async playSound() {
    console.log('Attempting to play sound...');
    
    // Method 1: Try AudioContext first (most reliable)
    if (await this.playWithAudioContext()) {
      return;
    }
    
    // Method 2: Try HTML5 Audio with user interaction simulation
    if (await this.playWithUserInteraction()) {
      return;
    }
    
    // Method 3: Try ViewChild audio element
    if (await this.playWithViewChild()) {
      return;
    }
    
    // Method 4: Try creating new audio element
    this.playWithCreateElement();
  }

  private async playWithAudioContext(): Promise<boolean> {
    try {
      if (this.audioContext && this.audioBuffer) {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = this.audioBuffer;
        gainNode.gain.value = 0.8;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start(0);
        console.log('AudioContext sound played successfully');
        return true;
      }
    } catch (error) {
      console.log('AudioContext play failed:', error);
    }
    return false;
  }

  private async playWithUserInteraction(): Promise<boolean> {
    try {
      // Simulate user interaction
      document.addEventListener('click', () => {}, { once: true });
      
      this.audio.currentTime = 0;
      await this.audio.play();
      console.log('HTML5 Audio played successfully');
      return true;
    } catch (error) {
      console.log('HTML5 Audio play failed:', error);
    }
    return false;
  }

  private async playWithViewChild(): Promise<boolean> {
    try {
      if (this.audioPlayer && this.audioPlayer.nativeElement) {
        const audioEl = this.audioPlayer.nativeElement;
        audioEl.volume = 0.8;
        audioEl.currentTime = 0;
        await audioEl.play();
        console.log('ViewChild audio played successfully');
        return true;
      }
    } catch (error) {
      console.log('ViewChild audio failed:', error);
    }
    return false;
  }

  private playWithCreateElement() {
    try {
      const audioElement = document.createElement('audio');
      audioElement.src = 'assets/sounds/transisi.mp3';
      audioElement.volume = 0.8;
      audioElement.autoplay = true;
      audioElement.muted = false;
      
      // Add to DOM temporarily
      document.body.appendChild(audioElement);
      
      audioElement.play().then(() => {
        console.log('Created audio element played successfully');
        // Remove from DOM after playing
        setTimeout(() => {
          document.body.removeChild(audioElement);
        }, 1000);
      }).catch(err => {
        console.log('Created audio element failed:', err);
        document.body.removeChild(audioElement);
      });
    } catch (error) {
      console.log('Create audio element method failed:', error);
    }
  }

  ngOnDestroy() {
    // Cleanup audio saat component dihancurkan
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    
    // Cleanup AudioContext
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}