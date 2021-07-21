/// <reference types="node" />
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { Expr, DocumentRef } from 'faunadb';
import { WebSocketEvent } from '@fanoutio/grip';

interface Methods<Context extends object> {
    [key: string]: ((this: MethodContext & Context, ...args: any[]) => any) | undefined;
}
/** For actions with a deferred response */
interface MethodResponse {
    /** The number of pending `defer` calls */
    pending: number;
    /** Events to send back */
    events: readonly WebSocketEvent[];
    /** Subscriptions to be updated */
    channels: ReadonlyMap<string, boolean>;
    /** Subscribe to a channel */
    subscribe: (channel: string) => void;
    /** Unsubscribe from a channel */
    unsubscribe: (channel: string) => void;
    /** Send an event to the client */
    send: (event: object) => void;
    /** Finalize the response */
    end: () => void;
}
declare class MethodContext {
    /** The connection identity. */
    readonly cid: string;
    /** The user identity. */
    uid: string | undefined;
    private response?;
    promise?: Promise<Buffer>;
    constructor(
    /** The connection identity. */
    cid: string, 
    /** The user identity. */
    uid: string | undefined);
    /** Get the `Ref` for the current user. */
    get user(): Expr<DocumentRef<object>>;
    /** Push content to the current connection. */
    push(content: object): Promise<void>;
    /** Defer the response indefinitely.  */
    defer(): Readonly<MethodResponse>;
}

declare type AnyContext = {
    [key: string]: any;
};
declare type MetaHeaders = {
    [name: string]: string | undefined;
};
declare type Authorizer = (meta: MetaHeaders, headers: IncomingHttpHeaders, method: string) => Promise<boolean> | boolean;
declare type ContextFactory<T extends object> = (meta: MetaHeaders, method: string) => Promise<T | null> | T | null;
interface OpleServiceConfig<Context extends object> {
    /** The request path for this service. */
    path: string;
    /** Deny requests using their headers. */
    authorize?: Authorizer;
    /** Load extra context for method calls. */
    getContext?: ContextFactory<Context>;
}
declare class OpleService<Context extends object = AnyContext> {
    protected getContext: ContextFactory<Context> | undefined;
    readonly path: string;
    readonly authorize: Authorizer;
    readonly methods: Readonly<Methods<Context>>;
    constructor(config: OpleServiceConfig<Context>);
    use(methods: Methods<Context>): void;
    applyContext(out: any, meta: MetaHeaders, method: string): Promise<void>;
    /** Remove this service from the global handler. */
    close(): void;
}

declare function handleRequest(req: IncomingMessage, res: ServerResponse, next?: () => void): Promise<void>;

declare const $E: unique symbol;
declare const $T: unique symbol;
declare abstract class Record<Events extends object = any, T extends object = any> {
    protected [$E]: Events;
    protected [$T]: T;
}

export { OpleService, OpleServiceConfig, Record, handleRequest };
