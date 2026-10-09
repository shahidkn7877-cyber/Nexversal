import { ContentImprovementRequest, ContentImprovementResponse } from '@/providers/ai/types';
import { aiService, AiService } from '@/providers/ai/service';

export class ContentImprovementService {
  private ai: AiService;

  constructor(ai: AiService = aiService) {
    this.ai = ai;
  }

  public async improveContent(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    // Validates that request is routed through the provider abstraction
    return this.ai.execute(request);
  }
}

export const contentImprovementService = new ContentImprovementService();
