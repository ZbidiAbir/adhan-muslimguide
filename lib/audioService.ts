import { Howl } from "howler";

export interface AudioServiceInterface {
  sound: Howl | null;
  isPlaying: boolean;
  isUnlocked: boolean;
  loadAdhan(url?: string): Promise<boolean>;
  unlockAudio(): Promise<void>;
  play(): void;
  stop(): void;
  setVolume(volume: number): void;
  getVolume(): number;
}

class AudioService implements AudioServiceInterface {
  public sound: Howl | null = null;
  public isPlaying: boolean = false;
  public isUnlocked: boolean = false;
  private currentVolume: number = 0.8;
  private pendingPlay: boolean = false;

  async unlockAudio(): Promise<void> {
    if (this.isUnlocked) return;

    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const context = new AudioContext();
      await context.resume();
      this.isUnlocked = true;
      console.log("Audio débloqué avec succès");

      if (this.pendingPlay && this.sound) {
        this.play();
      }
    }
  }

  async loadAdhan(url: string = "/adhan.mp3"): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.sound = new Howl({
        src: [url],
        html5: true,
        volume: this.currentVolume,
        preload: true,
        onload: () => {
          console.log("Adhan chargé avec succès");
          resolve(true);
        },
        onloaderror: (id: number, error: unknown) => {
          console.error("Erreur chargement Adhan:", error);
          reject(error);
        },
        onplayerror: (id: number, error: unknown) => {
          console.error("Erreur lecture Adhan:", error);
          this.unlockAudio().then(() => {
            if (this.sound && this.pendingPlay) {
              this.sound.play();
            }
          });
          reject(error);
        },
      });
    });
  }

  play(): void {
    if (!this.sound) {
      console.warn("Audio non chargé");
      return;
    }

    if (!this.isUnlocked) {
      console.log("Audio non débloqué, mise en attente...");
      this.pendingPlay = true;
      this.unlockAudio();
      return;
    }

    if (!this.isPlaying) {
      this.sound.play();
      this.isPlaying = true;
      this.pendingPlay = false;

      this.sound.once("end", () => {
        this.isPlaying = false;
        console.log("Adhan terminé");
      });
    }
  }

  stop(): void {
    if (this.sound && this.isPlaying) {
      this.sound.stop();
      this.isPlaying = false;
      this.pendingPlay = false;
    }
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.sound) {
      this.sound.volume(this.currentVolume);
    }
  }

  getVolume(): number {
    return this.currentVolume;
  }
}

export default new AudioService();
