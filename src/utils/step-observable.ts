const Rx = require('rxjs/Rx');
import { Observable } from 'rxjs/Observable';

export interface StepData<T> {
    value: T,
    next: () => void
}

export class StepObservable<T> {

    private dataEmiter = new Rx.Subject();
    private data:Array<T>;

    constructor(data: Array<T>) {
        this.data = data.map(item => item);
    }

    private next() {
        if(!this.data.length) {
            this.dataEmiter.complete();
        } else {
            this.dataEmiter.next({
                next: this.next.bind(this),
                value: this.data.shift()
            });
        }
    }

    public static of<T>(data: Array<T>): Observable<StepData<T>> {
        const step = new StepObservable(data);
        setTimeout(() => step.next(), 0);
        return step.dataEmiter.asObservable();
    }
}