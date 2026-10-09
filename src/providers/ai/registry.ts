import { AiProviderMetadata, IAiProviderAdapter, ProviderId } from './types';
import { GeminiProviderAdapter } from './adapters/gemini.adapter';
import { OpenAiProviderAdapter } from './adapters/openai.adapter';
import { ClaudeProviderAdapter } from './adapters/claude.adapter';
import { DeepSeekProviderAdapter } from './adapters/deepseek.adapter';

export class AiProviderRegistry {
  private adapters: Map<ProviderId, IAiProviderAdapter> = new Map();

  constructor() {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters() {
    this.register(new GeminiProviderAdapter());
    this.register(new OpenAiProviderAdapter());
    this.register(new ClaudeProviderAdapter());
    this.register(new DeepSeekProviderAdapter());
  }

  public register(adapter: IAiProviderAdapter): void {
    this.adapters.set(adapter.metadata.id, adapter);
  }

  public get(id: ProviderId): IAiProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAll(): IAiProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getAvailable(): IAiProviderAdapter[] {
    return this.getAll().filter((adapter) => adapter.isAvailable());
  }

  public getAllMetadata(): AiProviderMetadata[] {
    return this.getAll().map((adapter) => adapter.metadata);
  }

  public getDefaultProvider(): IAiProviderAdapter | undefined {
    const available = this.getAvailable();
    if (available.length > 0) {
      return available[0];
    }
    // Return gemini as default conceptual provider
    return this.get('gemini');
  }
}

export const aiProviderRegistry = new AiProviderRegistry();
