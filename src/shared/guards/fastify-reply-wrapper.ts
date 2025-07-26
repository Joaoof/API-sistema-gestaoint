import { FastifyReply } from 'fastify';

export class FastifyReplyWrapper {
    constructor(private reply: FastifyReply) { }

    header(name: string, value: string) {
        this.reply.header(name, value);
        return this;
    }
}
