import { RedisStorage } from './storage';

export class MovieQueueList extends RedisStorage.List {
    protected id = 'movie_id_queue';
    protected type = RedisStorage.DataType.Number;

    constructor() {
        super();
    }
}

export const movieQueueList = new MovieQueueList();