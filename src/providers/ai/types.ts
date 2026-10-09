export type ProviderId = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'custom' | string;

export type ProviderStatus = 'AVAILABLE' | 'NOT_CONFIGURED' | 'DISABLED' | 'ERROR';

export type IntegrationType = 'official_api' | 'custom_webhook' | 'none';

export type AiCapability =
  | 'content_improvement'
  | 'title_optimization'
  | 'meta_description'
  | 'readability_enhancement'
  | 'heading_restructuring'
  | 'keyword_placement_suggestion'
  | 'content_expansion';

export interface AiProviderMetadata {
  id: ProviderId;
  name: string;
  websiteUrl: string; // Informational official link only - NOT an API endpoint
  documentationUrl: string;
  integrationType: IntegrationType;
  capabilities: AiCapability[];
  status: ProviderStatus;
  statusReason?: string;
  envKeyRequired: string; // Name of environment variable on the server (e.g. GEMINI_API_KEY)
  isConfigured: boolean;
}

export type ImprovementAction =
  | 'improve_title'
  | 'improve_intro'
  | 'improve_meta_description'
  | 'improve_headings'
  | 'improve_readability'
  | 'suggest_keyword_placement'
  | 'improve_paragraph_clarity'
  | 'generate_suggestions';

export interface ContentImprovementRequest {
  content: string;
  action: ImprovementAction;
  focusKeyword?: string;
  desiredTone?: 'professional' | 'conversational' | 'authoritative' | 'engaging' | 'neutral';
  targetAudience?: string;
  instructions?: string;
  preferredProviderId?: ProviderId;
}

export interface ContentImprovementResponse {
  success: boolean;
  action: ImprovementAction;
  providerId?: ProviderId;
  providerStatus: ProviderStatus;
  result?: {
    original: string;
    improved: string;
    explanation: string;
    suggestions?: string[];
  };
  error?: {
    code: string;
    message: string;
    requiresConfiguration: boolean;
    configuredProviders: string[];
  };
}

export interface IAiProviderAdapter {
  readonly metadata: AiProviderMetadata;
  isAvailable(): boolean;
  execute(request: ContentImprovementRequest): Promise<ContentImprovementResponse>;
}
