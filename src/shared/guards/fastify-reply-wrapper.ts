import { FastifyReply } from 'fastify';

export class FastifyReplyWrapper {
  private reply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.reply = reply;
  }

  header(name: string, value: string) {
    this.reply.header(name, value);
    return this;
  }
}
