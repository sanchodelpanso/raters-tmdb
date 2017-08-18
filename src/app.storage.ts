import { ProcessingType } from './workers/tmdb.worker';
export class AppStorage {

    private storagePrefix = 'tmdb_worker_';

    public getUpdateQueue(type: ProcessingType) {
        return 1;
    }
}

export const storage = new AppStorage();