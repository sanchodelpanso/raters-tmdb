export interface TmdbPerson {
    id: number;
    gender: number;
    name: string;
    profile_path: string;
}

export interface TmdbPersonFull extends TmdbPerson {
    birthday: string;
    deathday: string;
    imdb_id: string;
    biography: string;
    popularity: number;
    place_of_birth: string;
}
