import { TmdbPerson } from './person';

export interface TmdbCast extends TmdbPerson {
    cast_id: number;
    character: string;
    order: number;
}
