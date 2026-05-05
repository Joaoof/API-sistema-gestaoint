import {
  MessageStatus,
  NotificationChannel,
} from '@prisma/client';

export interface SendMessagePayload {
  channel: NotificationChannel;
  toAddress: string;
  fromAddress?: string | null;
  subject?: string | null;
  body: string;
  templateKey?: string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResult {
  externalId?: string;
  status: MessageStatus;
  errorMessage?: string;
}

export const NOTIFICATION_CHANNEL_PORT = 'NOTIFICATION_CHANNEL_PORT';

export interface NotificationChannelPort {
  send(payload: SendMessagePayload): Promise<SendMessageResult>;
}
