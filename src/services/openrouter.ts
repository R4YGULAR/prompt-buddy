import axios from 'axios';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterAPI {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = OPENROUTER_BASE_URL;
  }

  async getModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://prompt-buddy.app',
          'X-Title': 'Prompt Buddy'
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = 'moonshotai/kimi-k2:free'
  ): Promise<string> {
    try {
      const response = await axios.post<ChatCompletionResponse>(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages,
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://prompt-buddy.app',
            'X-Title': 'Prompt Buddy'
          }
        }
      );

      return response.data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your OpenRouter API key.');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.response?.data?.error?.message) {
          throw new Error(error.response.data.error.message);
        }
      }
      throw new Error('Failed to generate response');
    }
  }

  async enhancePrompt(originalPrompt: string, enhancement: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a prompt engineering expert. Your task is to improve and enhance prompts for AI assistants. 
        
Guidelines:
- Make prompts more specific and actionable
- Add relevant context and constraints
- Improve clarity and structure
- Maintain the original intent
- Keep prompts concise but comprehensive
- Focus on practical, usable improvements`
      },
      {
        role: 'user',
        content: `Please enhance this prompt based on the following request:

Original prompt: "${originalPrompt}"

Enhancement request: "${enhancement}"

Return only the improved prompt, without any explanation or additional text.`
      }
    ];

    return await this.chatCompletion(messages);
  }

  async generatePrompt(description: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a prompt engineering expert. Create effective, clear, and actionable prompts for AI assistants based on user descriptions.

Guidelines:
- Make prompts specific and detailed
- Include relevant context and constraints
- Use clear, direct language
- Focus on desired outcomes
- Keep prompts practical and usable`
      },
      {
        role: 'user',
        content: `Create a prompt based on this description: "${description}"

Return only the prompt, without any explanation or additional text.`
      }
    ];

    return await this.chatCompletion(messages);
  }
}

export const createOpenRouterClient = (): OpenRouterAPI => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not found. Please add VITE_OPENROUTER_API_KEY to your .env file.');
  }
  return new OpenRouterAPI(apiKey);
};