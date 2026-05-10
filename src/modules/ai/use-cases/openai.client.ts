import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

export interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface OpenAiResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: OpenAiMessage;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async chat(args: {
    model: string;
    messages: OpenAiMessage[];
    tools?: OpenAiTool[];
    toolChoice?: 'auto' | 'none' | 'required';
    temperature?: number;
  }): Promise<OpenAiResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY não configurada. Adicione no .env.',
      );
    }

    const body: Record<string, unknown> = {
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.4,
    };
    if (args.tools && args.tools.length > 0) {
      body.tools = args.tools;
      body.tool_choice = args.toolChoice ?? 'auto';
    }

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(`OpenAI ${res.status}: ${errBody}`);
      throw new InternalServerErrorException(
        `OpenAI retornou ${res.status}. Verifique a API key e o modelo.`,
      );
    }

    return (await res.json()) as OpenAiResponse;
  }
}
