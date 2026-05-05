import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

export const WHATSAPP_MESSAGE_RECEIVED = 'WHATSAPP_MESSAGE_RECEIVED';
export const WHATSAPP_MESSAGE_UPDATED = 'WHATSAPP_MESSAGE_UPDATED';
export const WHATSAPP_PRESENCE_CHANGED = 'WHATSAPP_PRESENCE_CHANGED';
export const WHATSAPP_CONVERSATION_UPDATED = 'WHATSAPP_CONVERSATION_UPDATED';

/**
 * PubSub in-process. Pra escala horizontal, trocar por graphql-redis-subscriptions.
 */
@Injectable()
export class WhatsappPubSubService {
  private readonly pubsub = new PubSub();

  publish<T>(trigger: string, payload: T): void {
    void this.pubsub.publish(trigger, payload);
  }

  asyncIterator<T>(trigger: string | string[]): AsyncIterator<T> {
    return this.pubsub.asyncIterableIterator<T>(trigger);
  }
}
