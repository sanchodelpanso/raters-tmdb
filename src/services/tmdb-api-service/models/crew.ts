import { TmdbPerson } from './person';

export interface TmdbCrew extends TmdbPerson {
    credit_id: string;
    department: string;
    job: string;
}
