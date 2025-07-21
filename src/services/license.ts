import { Store } from "@tauri-apps/plugin-store";

export const FREE_TIER_LIMITS = {
  MAX_CUSTOM_PROMPTS: 5, // Free users can add 5 custom prompts (plus 6 defaults)
  MAX_TOTAL_PROMPTS: 11  // 6 defaults + 5 custom
};

export interface LicenseInfo {
  key: string;
  email?: string;
  tier: 'free' | 'pro';
  expiresAt?: Date;
  isValid: boolean;
}

export class LicenseManager {
  private static instance: LicenseManager;
  private licenseStore: Store | null = null;

  private constructor() {}

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  private async getStore(): Promise<Store> {
    if (!this.licenseStore) {
      this.licenseStore = await Store.load('license.json');
    }
    return this.licenseStore;
  }

  // Simple license key validation (you'd want something more secure in production)
  private validateLicenseKey(key: string): boolean {
    // Basic format check: PB-XXXX-XXXX-XXXX-XXXX
    const pattern = /^PB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(key)) {
      return false;
    }

    // Simple checksum validation (replace with real validation in production)
    const parts = key.split('-').slice(1); // Remove 'PB-' prefix
    const combined = parts.join('');
    
    // For demo purposes, keys ending in '0000' are valid
    return combined.endsWith('0000');
  }

  async setLicenseKey(key: string, email?: string): Promise<boolean> {
    const isValid = this.validateLicenseKey(key);
    
    const licenseInfo: LicenseInfo = {
      key,
      email,
      tier: isValid ? 'pro' : 'free',
      isValid,
      expiresAt: isValid ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined // 1 year
    };

    const store = await this.getStore();
    await store.set('license', licenseInfo);
    await store.save();

    return isValid;
  }

  async getLicenseInfo(): Promise<LicenseInfo> {
    try {
      const store = await this.getStore();
      const saved = await store.get<LicenseInfo>('license');
      
      if (saved) {
        // Check if license has expired
        if (saved.expiresAt && new Date() > new Date(saved.expiresAt)) {
          saved.isValid = false;
          saved.tier = 'free';
        }
        return saved;
      }
    } catch (error) {
      console.error('Error loading license:', error);
    }

    // Default free license
    return {
      key: '',
      tier: 'free',
      isValid: false
    };
  }

  async hasProLicense(): Promise<boolean> {
    const license = await this.getLicenseInfo();
    return license.isValid && license.tier === 'pro';
  }

  async removeLicense(): Promise<void> {
    const store = await this.getStore();
    await store.delete('license');
    await store.save();
  }

  async canAddPrompt(currentPromptCount: number): Promise<{ canAdd: boolean; reason?: string }> {
    const license = await this.getLicenseInfo();
    
    if (license.tier === 'pro') {
      return { canAdd: true };
    }
    
    // For free tier, check if they're at the limit
    if (currentPromptCount >= FREE_TIER_LIMITS.MAX_TOTAL_PROMPTS) {
      return { 
        canAdd: false, 
        reason: `Free tier is limited to ${FREE_TIER_LIMITS.MAX_CUSTOM_PROMPTS} custom prompts (${FREE_TIER_LIMITS.MAX_TOTAL_PROMPTS} total including defaults). Upgrade to PRO for unlimited prompts!` 
      };
    }
    
    return { canAdd: true };
  }

  async getPromptLimitInfo(currentPromptCount: number): Promise<{
    isAtLimit: boolean;
    isNearLimit: boolean;
    remainingPrompts: number;
    totalAllowed: number;
  }> {
    const license = await this.getLicenseInfo();
    
    if (license.tier === 'pro') {
      return {
        isAtLimit: false,
        isNearLimit: false,
        remainingPrompts: -1, // Unlimited
        totalAllowed: -1      // Unlimited
      };
    }
    
    const remaining = FREE_TIER_LIMITS.MAX_TOTAL_PROMPTS - currentPromptCount;
    return {
      isAtLimit: remaining <= 0,
      isNearLimit: remaining <= 2,
      remainingPrompts: Math.max(0, remaining),
      totalAllowed: FREE_TIER_LIMITS.MAX_TOTAL_PROMPTS
    };
  }

  // Generate a demo license key (for testing)
  generateDemoKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    for (let i = 0; i < 3; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    // Last segment ends with 0000 to make it valid for demo
    segments.push('0000');
    
    return 'PB-' + segments.join('-');
  }
}

export const licenseManager = LicenseManager.getInstance();