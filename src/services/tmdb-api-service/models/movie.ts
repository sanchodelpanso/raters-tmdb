import { TmdbGenre } from './genre';
import { TmdbCompany } from './company';
import { TmdbCountry } from './country';
import { TmdbCast } from './cast';
import { TmdbCrew } from './crew';

export type TmdbReleaseStatus = 'Released' | 'In Production'

export interface  TmdbMovie {
    adult: boolean;
    backdrop_path: string;
    budget: number;
    genres: Array<TmdbGenre>;
    id: number;
    imdb_id: string;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    production_companies: Array<TmdbCompany>;
    production_countries: Array<TmdbCountry>;
    release_date: string;
    revenue: number;
    runtime: number;
    status: TmdbReleaseStatus;
    tagline: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
    credits: {
        cast: Array<TmdbCast>;
        crew: Array<TmdbCrew>
    }
}