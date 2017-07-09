import * as events from 'events';

export enum State {
    DB_READY,
    DB_CONNECT_ERROR
}

export class AppState {
    private broker: events.EventEmitter = new events.EventEmitter();

    constructor() {
        console.log('STATE INIT');
    }

    public emit(event: State, ...args: any[]) {
        const name = String(event);
        this.broker.emit(name, args);
    }

    public on(event: State, listner: (...args: any[]) => void) {
        const name = String(event);
        this.broker.on(name, listner);
    }
}

export const state = new AppState();