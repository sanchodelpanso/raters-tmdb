import { TmdbMovie } from './models/movie';
const request = require('request');
const download = require('download');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const zlib = require('zlib');
const rimraf = require('rimraf');
const Rx = require('rxjs/Rx');
import { Observable } from 'rxjs/Observable';
import * as LineByLineReader from 'line-by-line';

import { config } from '../../config';
import { TmdbTvShow } from './models/tv-show';
import {TmdbPerson, TmdbPersonFull} from "./models/person";

export interface ShortMovie {
    adult: boolean;
    id: number;
    original_title: string;
    popularity: number;
}

export interface ShortPerson {
    adult: boolean;
    id: number;
    name: string;
    popularity: number;
}

export interface ShortTv {
    id: number;
    original_name: number;
    popularity: number;
}

export interface FileLineResponse {
    next: () => {};
}

export interface FileMovieResponse extends FileLineResponse {
    movie: ShortMovie;
}

export interface FilePersonResponse extends FileLineResponse {
    person: ShortPerson;
}

export interface FileTvResponse extends FileLineResponse {
    tv: ShortTv;
}

export class TmdbApiService {

    public static config: any = {
        perPage: 20
    };

    private apiKey: string;
    private baseUrl: string = `https://api.themoviedb.org/3`;
    private fileBaseUrl: string = 'http://files.tmdb.org/p/exports/';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        console.log('TMDB API: INITIALIZED');
    }

    private discoverMovieUrl(page: number) {
        return `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=en-US&sort_by=popularity.desc&page=${page}`;
    }

    private movieDetailsUrl(id: number) {
        return `${this.baseUrl}/movie/${id}?api_key=${this.apiKey}&language=en-US&append_to_response=credits,videos`;
    }

    private tvShowDetailsUrl(id: number) {
        return `${this.baseUrl}/tv/${id}?api_key=${this.apiKey}&language=en-US&append_to_response=credits,external_ids,videos`;
    }

    private personDetailsUrl(id: number) {
        return `${this.baseUrl}/person/${id}?api_key=${this.apiKey}&language=en-US`;
    }

    private moviesFileName(): string {
        const date = moment().subtract(1, "days").format('MM_DD_YYYY');
        return `movie_ids_${date}.json.gz`;
    }

    private tvSeriesFileName(): string {
        const date = moment().subtract(1, "days").format('MM_DD_YYYY');
        return `tv_series_ids_${date}.json.gz`;
    }

    private peopleFileName(): string {
        const date = moment().subtract(1, "days").format('MM_DD_YYYY');
        return `person_ids_${date}.json.gz`;
    }

    public discoverMovies(page: number): Promise<{ movies: any, currentPage: number, totalPages: number }> {
        return new Promise((resolve, reject) => {
            request.get({
                url: this.discoverMovieUrl(page),
                json: true
            }, function (error: any, response: any, body: any) {
                let result = {
                    movies: [] as any[],
                    currentPage: 0,
                    totalPages: 0
                };

                if (error || response.statusCode !== 200) {
                    console.error(error);
                    resolve(result);
                }

                result = {
                    movies: body.results as any[] || [],
                    currentPage: body.page as number,
                    totalPages: body.total_pages as number
                };

                resolve(result);
            });
        });
    }

    public getMovieById(id: number): Promise<TmdbMovie> {
        return new Promise((resolve, reject) => {
            request.get({url: this.movieDetailsUrl(id), json: true}, function (error: any, response: any, body: any) {
                if (error || response.statusCode !== 200)
                    resolve(null);

                resolve(body);
            });

        });
    }

    public getTvById(id: number): Promise<TmdbTvShow> {
        return new Promise((resolve, reject) => {
            request.get({url: this.tvShowDetailsUrl(id), json: true}, function (error: any, response: any, body: any) {
                if (error || response.statusCode !== 200)
                    resolve(null);

                resolve(body);
            });

        });
    }

    public getPersonById(id: number): Promise<TmdbPersonFull> {
        return new Promise((resolve, reject) => {
            request.get({url: this.personDetailsUrl(id), json: true}, function (error: any, response: any, body: any) {
                if (error || response.statusCode !== 200)
                    resolve(null);

                resolve(body);
            });

        });
    }

    public readMoviesFile(): Observable<FileMovieResponse> {
        const folder = 'temp';
        const fileName = this.moviesFileName();
        const dataFileName = 'data.txt';
        const url = this.fileBaseUrl + fileName;
        const fileSub = new Rx.Subject();

        download(url, folder).then(() => {
            console.log(`FILE DOWNLOADED:`, url);
            fs.createReadStream(`${folder}/${fileName}`)
                .on('error', (err: any) => console.error(err))
                .pipe(zlib.createUnzip())
                .pipe(fs.createWriteStream(`${folder}/${dataFileName}`))
                .on('close', () => {
                    const reader = new LineByLineReader(`${folder}/${dataFileName}`);
                    reader.on('error', (err: any) => console.error(err));
                    reader.on('line', (line: any) => {
                        const movie: ShortMovie = JSON.parse(line);

                        reader.pause();
                        fileSub.next(<FileMovieResponse>{
                            movie: movie,
                            next: reader.resume.bind(reader)
                        });
                    });
                    reader.on('end', () => {
                        rimraf(folder, () => {
                            console.log(`FILE DELETED:`, url);
                            fileSub.complete();
                        });
                    });
                });
        });

        return fileSub.asObservable();
    }

    public readTvSeriesFile(): Observable<FileTvResponse> {
        const folder = 'temp';
        const fileName = this.tvSeriesFileName();
        const dataFileName = 'data.txt';
        const url = this.fileBaseUrl + fileName;
        const fileSub = new Rx.Subject();

        download(url, folder).then(() => {
            console.log(`FILE DOWNLOADED:`, url);
            fs.createReadStream(`${folder}/${fileName}`)
                .on('error', (err: any) => console.error(err))
                .pipe(zlib.createUnzip())
                .pipe(fs.createWriteStream(`${folder}/${dataFileName}`))
                .on('close', () => {
                    const reader = new LineByLineReader(`${folder}/${dataFileName}`);
                    reader.on('error', (err: any) => console.error(err));
                    reader.on('line', (line: any) => {
                        const movie: ShortTv = JSON.parse(line);

                        reader.pause();
                        fileSub.next(<FileTvResponse>{
                            tv: movie,
                            next: reader.resume.bind(reader)
                        });
                    });
                    reader.on('end', () => {
                        rimraf(folder, () => {
                            console.log(`FILE DELETED:`, url);
                            fileSub.complete();
                        });
                    });
                });
        });

        return fileSub.asObservable();
    }

    public readPeopleFile(): Observable<FilePersonResponse> {
        const folder = 'temp';
        const fileName = this.peopleFileName();
        const dataFileName = 'data.txt';
        const url = this.fileBaseUrl + fileName;
        const fileSub = new Rx.Subject();

        download(url, folder).then(() => {
            console.log(`FILE DOWNLOADED:`, url);
            fs.createReadStream(`${folder}/${fileName}`)
                .on('error', (err: any) => console.error(err))
                .pipe(zlib.createUnzip())
                .pipe(fs.createWriteStream(`${folder}/${dataFileName}`))
                .on('close', () => {
                    const reader = new LineByLineReader(`${folder}/${dataFileName}`);
                    reader.on('error', (err: any) => console.error(err));
                    reader.on('line', (line: any) => {
                        const person: ShortPerson = JSON.parse(line);

                        reader.pause();
                        fileSub.next(<FilePersonResponse>{
                            person: person,
                            next: reader.resume.bind(reader)
                        });
                    });
                    reader.on('end', () => {
                        rimraf(folder, () => {
                            console.log(`FILE DELETED:`, url);
                            fileSub.complete();
                        });
                    });
                });
        });

        return fileSub.asObservable();
    }

}

export const tmdb = new TmdbApiService(config.tmdb.apiKey);
