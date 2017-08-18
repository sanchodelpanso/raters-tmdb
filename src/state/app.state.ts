import * as events from 'events';
import { State } from './state';
import { subscribers } from './state-subscribers';

export class AppState {
    private broker: events.EventEmitter = new events.EventEmitter();

    constructor() {
        console.log('STATE INIT');

        this.initSubscribers();
    }

    public emit(event: State, data?: any) {
        const name = String(event);
        this.broker.emit(name, data);
    }

    public on(event: State, listner: (data: any) => void) {
        const name = String(event);
        this.broker.on(name, listner);
    }

    private initSubscribers() {
        subscribers.forEach(sub => this.on(sub.state, sub.listner));
    }
}

export const state = new AppState();