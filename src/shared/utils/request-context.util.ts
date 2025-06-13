import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
    requestId: string;
}

export const als = new AsyncLocalStorage<RequestContext>();