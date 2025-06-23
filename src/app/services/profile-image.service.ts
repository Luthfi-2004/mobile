// src/app/services/profile-image.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileImageService {
  private readonly PROFILE_IMAGES_KEY = 'user_profile_images';
  private readonly DEFAULT_IMAGE = 'assets/img/default-profile.jpg';
  
  private currentProfileImageSubject = new BehaviorSubject<string>(this.DEFAULT_IMAGE);
  public currentProfileImage$ = this.currentProfileImageSubject.asObservable();

  constructor() {}

  /**
   * Mendapatkan foto profil untuk user tertentu
   * @param userId - ID user
   * @returns URL foto profil atau default image
   */
  getUserProfileImage(userId: number | string): string {
    const profileImages = this.getAllProfileImages();
    return profileImages[userId.toString()] || this.DEFAULT_IMAGE;
  }

  /**
   * Menyimpan foto profil untuk user tertentu
   * @param userId - ID user
   * @param imageDataUrl - Data URL dari foto profil
   */
  setUserProfileImage(userId: number | string, imageDataUrl: string): void {
    const profileImages = this.getAllProfileImages();
    profileImages[userId.toString()] = imageDataUrl;
    
    localStorage.setItem(this.PROFILE_IMAGES_KEY, JSON.stringify(profileImages));
    
    // Update BehaviorSubject jika ini adalah user yang sedang aktif
    this.currentProfileImageSubject.next(imageDataUrl);
  }

  /**
   * Menghapus foto profil user tertentu
   * @param userId - ID user
   */
  removeUserProfileImage(userId: number | string): void {
    const profileImages = this.getAllProfileImages();
    delete profileImages[userId.toString()];
    
    localStorage.setItem(this.PROFILE_IMAGES_KEY, JSON.stringify(profileImages));
  }

  /**
   * Load foto profil untuk user yang sedang aktif
   * @param userId - ID user yang sedang aktif
   */
  loadCurrentUserProfileImage(userId: number | string): void {
    const profileImage = this.getUserProfileImage(userId);
    this.currentProfileImageSubject.next(profileImage);
  }

  /**
   * Mendapatkan foto profil user yang sedang aktif
   * @returns URL foto profil current user
   */
  getCurrentProfileImage(): string {
    return this.currentProfileImageSubject.value;
  }

  /**
   * Reset foto profil ke default untuk user yang sedang logout
   */
  resetCurrentProfileImage(): void {
    this.currentProfileImageSubject.next(this.DEFAULT_IMAGE);
  }

  /**
   * Membersihkan semua foto profil (untuk keperluan maintenance)
   */
  clearAllProfileImages(): void {
    localStorage.removeItem(this.PROFILE_IMAGES_KEY);
    this.currentProfileImageSubject.next(this.DEFAULT_IMAGE);
  }

  /**
   * Mendapatkan semua foto profil dari localStorage
   * @returns Object berisi mapping userId -> imageDataUrl
   */
  private getAllProfileImages(): { [userId: string]: string } {
    const stored = localStorage.getItem(this.PROFILE_IMAGES_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Mendapatkan ukuran storage yang digunakan oleh foto profil
   * @returns Ukuran dalam bytes
   */
  getStorageSize(): number {
    const data = localStorage.getItem(this.PROFILE_IMAGES_KEY);
    return data ? new Blob([data]).size : 0;
  }

  /**
   * Mengkompresi foto profil jika terlalu besar
   * @param imageDataUrl - Data URL original
   * @param maxSizeKB - Ukuran maksimal dalam KB (default: 500KB)
   * @returns Promise<string> - Data URL yang sudah dikompres
   */
  async compressImage(imageDataUrl: string, maxSizeKB: number = 500): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Tentukan ukuran maksimal
        const maxWidth = 400;
        const maxHeight = 400;
        
        let { width, height } = img;
        
        // Hitung rasio untuk resize
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Gambar ke canvas
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert ke data URL dengan kompresi
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        // Kurangi quality jika ukuran masih terlalu besar
        while (result.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      
      img.src = imageDataUrl;
    });
  }
}