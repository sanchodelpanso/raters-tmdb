import { TmdbGenre } from './genre';
import { TmdbCompany } from './company';
import { TmdbCountry } from './country';
import { TmdbCast } from './cast';
import { TmdbCrew } from './crew';
import { TmdbPerson } from './person';
import { TmdbNetwork } from './network';
import {TmdbMovieVideo} from "./movie";

export type TmdbTvStatus = 'Returning Series' | 'Ended';

export interface  TmdbTvShow {
    backdrop_path: string;
    created_by: Array<TmdbPerson>;
    episode_run_time: Array<number>;
    first_air_date: string;
    genres: Array<TmdbGenre>;
    id: number;
    in_production: boolean;
    last_air_date: string;
    name: string;
    networks: Array<TmdbNetwork>;
    number_of_episodes: number;
    number_of_seasons: number;
    original_language: string;
    original_name: string;
    overview: string;
    popularity: number;
    poster_path: string;
    production_companies: Array<TmdbCompany>;
    production_countries: Array<TmdbCountry>;
    status: TmdbTvStatus;
    vote_average: number;
    vote_count: number;
    videos: {
        results: Array<TmdbMovieVideo>;
    };
    credits: {
        cast: Array<TmdbCast>;
        crew: Array<TmdbCrew>
    };
    external_ids: {
        imdb_id: string;
    };
}
