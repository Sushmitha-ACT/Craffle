import { VerificationProvider } from './providerInterface.js';
import { CashfreeVerificationProvider } from './cashfreeProvider.js';
import { TruIdVerificationProvider } from './truidProvider.js';

class VerificationProviderFactory {
  private providers: Map<string, VerificationProvider> = new Map();
  private activeProviderName: string = 'truid';

  constructor() {
    this.registerProvider(new CashfreeVerificationProvider());
    this.registerProvider(new TruIdVerificationProvider());

    const envProvider = (process.env.VERIFICATION_PROVIDER || 'truid').toLowerCase();
    if (this.providers.has(envProvider)) {
      this.activeProviderName = envProvider;
    }
  }

  public registerProvider(provider: VerificationProvider) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public getProvider(name?: string): VerificationProvider {
    const targetName = (name || this.activeProviderName).toLowerCase();
    const provider = this.providers.get(targetName);
    if (!provider) {
      throw new Error(`Verification provider "${targetName}" is not registered.`);
    }
    return provider;
  }

  public getActiveProvider(): VerificationProvider {
    return this.getProvider(this.activeProviderName);
  }
}

export const verificationFactory = new VerificationProviderFactory();
