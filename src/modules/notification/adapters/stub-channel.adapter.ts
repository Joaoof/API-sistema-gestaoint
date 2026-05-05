import { Injectable, Logger } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import {
  NotificationChannelPort,
  SendMessagePayload,
  SendMessageResult,
} from '../ports/notification-channel.port';

@Injectable()
export class StubChannelAdapter implements NotificationChannelPort {
  private readonly logger = new Logger(StubChannelAdapter.name);

  async send(payload: SendMessagePayload): Promise<SendMessageResult> {
    this.logger.log(
      `[STUB ${payload.channel}] -> ${payload.toAddress} :: ${payload.subject ?? '(sem assunto)'}`,
    );
    return {
      externalId: `stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: MessageStatus.SENT,
    };
  }
}
