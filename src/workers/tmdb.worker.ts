import { noop, range, unionWith, unionBy, isEqual, map, get, flatten, includes, sum, values } from 'lodash';
import * as moment from 'moment';
import * as async from 'async';
const Rx = require('rxjs/Rx');
import 'rxjs/add/operator/filter';

import {
    TmdbApiService,
    tmdb,
    FileMovieResponse,
    FileTvResponse,
    FilePersonResponse
} from '../services/tmdb-api-service/tmdb-api-service';
import { Movie, MovieAttribute, MovieInstance } from '../models/movie';
import db from '../app.db';
import { TmdbMovie } from '../services/tmdb-api-service/models/movie';
import { TmdbCrew } from '../services/tmdb-api-service/models/crew';
import { TmdbCast } from '../services/tmdb-api-service/models/cast';
import {Person, PersonAttribute, PersonInstance} from '../models/person';
import { Crew, CrewAttribute } from '../models/crew';
import { Cast, CastAttribute } from '../models/cast';
import { Company, CompanyAttribute } from '../models/company';
import { MovieCompany, MovieCompanyAttribute } from '../models/movie-company';
import { MovieGenre, MovieGenreAttribute } from '../models/movie-genre';
import { StepObservable } from '../utils/step-observable';
import { TmdbTvShow } from '../services/tmdb-api-service/models/tv-show';
import { Video, VideoAttribute } from "../models/video";
import {TmdbPersonFull} from "../services/tmdb-api-service/models/person";


export enum ProcessingType {
    MOVIE,
    TV,
    PEOPLE
}

export class TMDBWorker {

    private tmdb: TmdbApiService = tmdb;
    private storagePrefix = 'tmdb_worker';

    public updatePeople(): Promise<number> {
        return new Promise((resolve) => {
            /*
             TODO: handle errors
             */
            console.log('PEOPLE UPDATE: START');
            const popularityThreshold = 0.1;
            const key = `id_queue_${ProcessingType.PEOPLE}`;
            const listKey = `${this.storagePrefix}_${key}`;

            let peopleUpdated: number;

            this.clearStorage(key).then(() => {
                console.log('FETCH START');
                this.tmdb.readPeopleFile()
                    .filter((line: FilePersonResponse) => {
                        const person = line.person;
                        const proceed = person.popularity > popularityThreshold && person.adult === false;

                        if (!proceed) {
                            line.next();
                        }
                        return proceed;
                    })
                    .subscribe(
                        (line: FilePersonResponse) => {
                            const person = line.person;
                            this.pushIDToStorage(ProcessingType.PEOPLE, person.id);
                            line.next();
                        },
                        noop,
                        () => {
                            console.log('FETCH DONE');
                            console.log('SYNC PEOPLE: START');

                            db.redis.llen(listKey, (err, val) => peopleUpdated = val);

                            this.syncPeople().then(() => {
                                console.log('SYNC PEOPLE: DONE');
                                resolve(peopleUpdated);
                            });
                        }
                    );
            });
        });
    }

    public updateMovies(force: boolean = false): Promise<number> {
        return new Promise((resolve) => {
            /*
             TODO: handle errors
             */
            console.log('MOVIE UPDATE: START');
            const popularityThreshold = 0.1;
            const key = `id_queue_${ProcessingType.MOVIE}`;
            const listKey = `${this.storagePrefix}_${key}`;

            let moviesUpdated: number;

            this.clearStorage(key).then(() => {
                console.log('FETCH START');
                this.tmdb.readMoviesFile()
                    .filter((line: FileMovieResponse) => {
                        const movie = line.movie;
                        const proceed = movie.popularity > popularityThreshold && movie.adult === false;

                        if (!proceed) {
                            line.next();
                        }
                        return proceed;
                    })
                    .subscribe(
                        (line: FileMovieResponse) => {
                            const movie = line.movie;
                            this.processId(movie.id, ProcessingType.MOVIE, force).then(() => {
                                line.next();
                            });
                        },
                        noop,
                        () => {
                            console.log('FETCH DONE');
                            console.log('SYNC MOVIES: START');

                            db.redis.llen(listKey, (err, val) => moviesUpdated = val);

                            this.syncMovies().then(() => {
                                console.log('SYNC MOVIES: DONE');
                                resolve(moviesUpdated);
                            });
                        }
                    );
            });
        });
    }

    public updateTvSeries(force: boolean = false): Promise<number> {
        return new Promise((resolve, reject) => {
            /*
             TODO: handle errors
             */
            console.log('TV SERIES UPDATE: START');
            const popularityThreshold = 0.1;
            const key = `id_queue_${ProcessingType.TV}`;
            const listKey = `${this.storagePrefix}_${key}`;
            let showsUpdated: number;

            this.clearStorage(key).then(() => {
                console.log('FETCH START');
                this.tmdb.readTvSeriesFile()
                    .filter((line: FileTvResponse) => {
                        const movie = line.tv;
                        const proceed = movie.popularity > popularityThreshold;

                        if (!proceed) {
                            line.next();
                        }
                        return proceed;
                    })
                    .subscribe(
                        (line: FileTvResponse) => {
                            const movie = line.tv;
                            this.processId(movie.id, ProcessingType.TV, force).then(() => {
                                line.next();
                            });
                        },
                        noop,
                        () => {
                            console.log('FETCH DONE');
                            console.log('SYNC TVs: START');

                            db.redis.llen(listKey, (err, val) => showsUpdated = val);

                            this.syncTvSeries().then(() => {
                                console.log('SYNC TVs: DONE');
                                resolve(showsUpdated);
                            });
                        }
                    );
            });
        });
    }

    private syncMovies() {
        const key = `id_queue_${ProcessingType.MOVIE}`;
        const idRange = range(0, 4);

        return new Promise((resolve) => {
            Rx.Observable.interval(1050)
                .switchMap(() => Rx.Observable.fromPromise(Promise.all(idRange.map(() => this.popFromStorage(key)))))
                .map((data: string[]) => data.map(i => parseInt(i)).filter(i => !isNaN(i)))
                .takeWhile((ids: number[]) => ids.length)
                // .do((ids: number[]) => console.time(`GET Movies(${ids.toString()})`))
                .switchMap((ids: number[]) => Rx.Observable.fromPromise(Promise.all(ids.map(id => this.tmdb.getMovieById(id)))))
                .map((movies: TmdbMovie[]) => movies.filter(movie => movie))
                // .do((movies: TmdbMovie[]) => console.timeEnd(`GET Movies(${movies.map(i => i.id).toString()})`))
                .subscribe((movies: TmdbMovie[]) => {
                    // console.time(`All data save(${movies.map(i => i.id).toString()})`);
                    let movieIds = {};

                    StepObservable
                        .of(movies)
                        .subscribe((data) => {
                                const movie = data.value;
                                this.saveMovie(movie)
                                    .then((movieInDb) => {
                                        movieIds[movie.id] = movieInDb.id;
                                        data.next();
                                        /*
                                         TODO: Update state in Redis
                                         */
                                    }).catch(err => console.log(err));
                            },
                            noop,
                            () => {
                                this.saveMoviePeopleCollection(movies, movieIds)
                                    .then(() => this.saveMovieGenreCollection(movies, movieIds))
                                    .then(() => this.saveMovieCompanyCollection(movies, movieIds))
                                    .then(() => this.saveMovieVideoCollection(movies, movieIds))
                                    .then(() => {
                                        // console.timeEnd(`All data save(${movies.map(i => i.id).toString()})`);
                                    })
                                    .catch(err => console.error('Error DB save:', err));
                            }
                        );
                },
                (err: any) => console.log('Error In PIPE', err),
                () => {
                    resolve();
                });
        });
    }

    private syncTvSeries() {
        const key = `id_queue_${ProcessingType.TV}`;
        const idRange = range(0, 4);

        return new Promise((resolve, reject) => {
            Rx.Observable.interval(1050)
                .switchMap(() => Rx.Observable.fromPromise(Promise.all(idRange.map(() => this.popFromStorage(key)))))
                .map((data: string[]) => data.map(i => parseInt(i)).filter(i => !isNaN(i)))
                .takeWhile((ids: number[]) => ids.length)
                .switchMap((ids: number[]) => Rx.Observable.fromPromise(Promise.all(ids.map(id => this.tmdb.getTvById(id)))))
                .map((series: TmdbTvShow[]) => series.filter(show => show))
                .subscribe((series: TmdbTvShow[]) => {
                        // console.time(`All data save(${series.map(i => i.id).toString()})`);
                        let movieIds = {};

                        StepObservable
                            .of(series)
                            .subscribe((data) => {
                                    const show = data.value;
                                    this.saveTvShow(show)
                                        .then((movieInDb) => {
                                            movieIds[show.id] = movieInDb.id;

                                            data.next();
                                            /*
                                             TODO: Update state in Redis
                                             */
                                        }).catch(err => console.log(err));
                                },
                                noop,
                                () => {
                                    this.saveMoviePeopleCollection(series, movieIds)
                                        .then(() => this.saveMovieGenreCollection(series, movieIds))
                                        .then(() => this.saveMovieCompanyCollection(series, movieIds))
                                        .then(() => this.saveMovieVideoCollection(series, movieIds))
                                        .then(() => {
                                            // console.timeEnd(`All data save(${series.map(i => i.id).toString()})`);
                                        })
                                        .catch(err => console.error('Error DB save:', err));
                                }
                            );
                    },
                    (err: any) => console.log('Error In PIPE', err),
                    () => {
                        resolve();
                    });
        });
    }

    private syncPeople() {
        const key = `id_queue_${ProcessingType.PEOPLE}`;
        const idRange = range(0, 4);

        return new Promise((resolve) => {
            Rx.Observable.interval(1050)
                .switchMap(() => Rx.Observable.fromPromise(Promise.all(idRange.map(() => this.popFromStorage(key)))))
                .map((data: string[]) => data.map(id => parseInt(id)).filter(id => !isNaN(id)))
                .takeWhile((ids: number[]) => ids.length)
                .switchMap((ids: number[]) => Rx.Observable.fromPromise(Promise.all(ids.map(id => this.tmdb.getPersonById(id)))))
                .map((people: TmdbPersonFull[]) => people.filter(person => person))
                .subscribe((people: TmdbPersonFull[]) => {
                        StepObservable
                            .of(people)
                            .subscribe((data) => {
                                    const person = data.value;
                                    this.savePerson(person)
                                        .then((personInDb) => {
                                            console.log(`All data save(${personInDb.id})`);
                                            data.next();
                                            /*
                                             TODO: Update state in Redis
                                             */
                                        }).catch(err => console.log(err));
                                },
                                noop,
                                noop
                            );
                    },
                    (err: any) => console.log('Error In PIPE', err),
                    () => {
                        resolve();
                    });
        });
    }

    private popFromStorage(key: string) {
        return new Promise((resolve, reject) => {
            const listKey = `${this.storagePrefix}_${key}`;
            db.redis.lpop(listKey, (err, data) => {
                if(err) {
                    resolve(null);
                }
                /*
                 TODO: Error handler
                 */
                resolve(data);
            });
        });
    }

    private processId(id: number, type: ProcessingType, force: boolean = false) {
        return new Promise((resolve, reject) => {
            const key = `id_queue_${type}`;
            let today: moment.Moment = moment();

            this.getRecord(id, type).then((record: MovieInstance) => {
                if (!record
                    || force
                    || (
                        type === ProcessingType.MOVIE
                        && (
                            today.isBefore(record.release_date)
                            || ['Released', 'Canceled'].indexOf(record.status) < 0
                            || today.subtract(1, 'year').isBefore(record.release_date)
                        )
                    )
                    || (type === ProcessingType.TV && ['Released', 'Canceled'].indexOf(record.status) < 0)) {
                    this.pushToStorage(key, String(id));
                }

                resolve();
            });
        });
    }

    private pushIDToStorage(type: ProcessingType, id: number) {
        const key = `id_queue_${type}`;
        this.pushToStorage(key, String(id));
    }

    private pushToStorage(key: string, value: string) {
        const listKey = `${this.storagePrefix}_${key}`;
        db.redis.rpush(listKey, value, (err, reply) => {
            /*
             TODO: Error handler
             */
        });
    }

    private clearStorage(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const listKey = `${this.storagePrefix}_${key}`;
            db.redis.del(listKey, (err) => {
                /*
                 TODO: Error handler
                 */
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private getRecord(id: number, type: ProcessingType) {
        const movieType = type === ProcessingType.MOVIE ? 'MOVIE' : 'TV';

        return Movie.findOne({
            where: {
                tmdb_id: id,
                type: movieType
            }
        });
    }

    private saveMovieCompanyCollection<T extends TmdbTvShow | TmdbMovie>(movies: T[], idsRelation: any) {
        const movieIds: number[] = values(idsRelation);

        const movieCompanies: MovieCompanyAttribute[] = flatten(
            movies.map(movie => {
                return map(movie.production_companies, company => {
                    return {
                        movie_id: idsRelation[movie.id],
                        company_id: company.id
                    };
                });
            })
        );

        const сompanies: CompanyAttribute[] = unionBy(flatten(movies.map(movie => get(movie, 'production_companies', []))), 'id');
        const companyIds = сompanies.map(c => c.id);

        return Company
            .destroy({
                where: {
                    id: companyIds
                }
            })
            .then(() => Company.bulkCreate(сompanies))
            .then(() => MovieCompany
                .destroy({
                    where: {
                        movie_id: movieIds
                    }
                })
            ).then(() => MovieCompany.bulkCreate(movieCompanies));

    }

    private saveMovieVideoCollection<T extends TmdbTvShow | TmdbMovie>(movies: T[], idsRelation: any) {
        const movieIds: number[] = values(idsRelation);

        const moviesVideos: VideoAttribute[] = flatten(
            movies.map(movie => {
                const videos = movie.videos.results.filter(video => video.type === 'Trailer' && video.site === 'YouTube');
                return map(videos, video => {
                    return {
                        id: video.id,
                        movie_id: idsRelation[movie.id],
                        name: video.name,
                        key: video.key
                    };
                });
            })
        );

        return Video
            .destroy({
                where: {
                    movie_id: movieIds
                }
            })
            .then(() => Video.bulkCreate(moviesVideos));

    }

    private saveMovieGenreCollection<T extends TmdbTvShow | TmdbMovie>(movies: T[], idsRelation: any) {
        const movieIds: number[] = values(idsRelation);

        const genres: MovieGenreAttribute[] = flatten(
            movies.map((movie) => {
                return map(movie.genres, genre => {
                    return {
                        movie_id: idsRelation[movie.id],
                        genre_id: genre.id
                    };
                });
            })
        );

        return MovieGenre
            .destroy({
                where: {
                    movie_id: movieIds
                }
            })
            .then(() => MovieGenre.bulkCreate(genres));

    }

    private mapPerson(data: TmdbCrew | TmdbCast): PersonAttribute {
        return {
            id: data.id,
            name: data.name,
            profile_path: data.profile_path
        }
    }

    private saveMoviePeopleCollection<T extends TmdbTvShow | TmdbMovie>(moviesTmdb: T[], idsRelation: any) {
        const movieIds: number[] = values(idsRelation);

        const allPeopleCrew = flatten(
            moviesTmdb
                .map(movieTmdb => {
                    const tmdbCrews = get(movieTmdb, 'credits.crew') as TmdbCrew[];
                    return map(tmdbCrews, item => {
                        return {
                            name: item.name,
                            profile_path: item.profile_path,
                            id: item.id,
                            movie_id: movieTmdb.id,
                            job: item.job,
                            gender: item.gender
                        };
                    });
                })
        );

        const allPeopleCast = flatten(
            moviesTmdb
                .map(movieTmdb => {
                    const tmdbCrews = get(movieTmdb, 'credits.cast') as TmdbCast[];
                    return map(tmdbCrews, item => {
                        return {
                            name: item.name,
                            profile_path: item.profile_path,
                            id: item.id,
                            movie_id: movieTmdb.id,
                            character: item.character,
                            gender: item.gender
                        };
                    });
                })
        );

        const crewPeople = map<Object, PersonAttribute>(allPeopleCrew, this.mapPerson);
        const castPeople = map<Object, PersonAttribute>(allPeopleCast, this.mapPerson);

        const people: PersonAttribute[] = unionBy(crewPeople, castPeople, 'id');
        const peopleIds: number[] = people.map(i => i.id);

        const crews: CrewAttribute[] = allPeopleCrew.map(item => {
            return {
                person_id: item.id,
                movie_id: idsRelation[item.movie_id],
                job: item.job
            };
        });

        const casts: CastAttribute[] = allPeopleCast.map(item => {
            return {
                person_id: item.id,
                movie_id: idsRelation[item.movie_id],
                character: item.character
            };
        });

        return Person
            .findAll({
                where: {
                    id: peopleIds
                },
                attributes: ['id']
            })
            .then((existedPeople: PersonAttribute[]) => {
                const ids = existedPeople.map(p => p.id);
                const newPeople = people.filter(person => !includes(ids, person.id));
                /*
                 TODO: Add new people in Redis for next update
                 */

                return Person.bulkCreate(newPeople);
            })
            .then(() => Crew.destroy({
                            where: {
                                movie_id: movieIds
                            }
                        })
            )
            .then(() => Cast.destroy({
                    where: {
                        movie_id: movieIds
                    }
                })
            )
            .then(() => Crew.bulkCreate(crews))
            .then(() => Cast.bulkCreate(casts));
    }

    private saveMovie(movieTmdb: TmdbMovie): Promise<MovieInstance> {
        return new Promise((resolve, reject) => {
            const movieAttrs: MovieAttribute = {
                tmdb_id: movieTmdb.id,
                type: 'MOVIE',
                release_date: movieTmdb.release_date || null,
                tmdb_popularity: movieTmdb.popularity,
                backdrop: movieTmdb.backdrop_path,
                poster: movieTmdb.poster_path,
                title: movieTmdb.title,
                description: movieTmdb.overview,
                imdb_id: movieTmdb.imdb_id ? parseInt(movieTmdb.imdb_id.substr(2)) : null,
                runtime: movieTmdb.runtime,
                status: movieTmdb.status
            };

            Movie
                .findOne({
                    where: {
                        tmdb_id: movieAttrs.tmdb_id,
                        type: movieAttrs.type
                    }
                })
                .then((movie) => {
                    if (movie) {
                        return movie.update(movieAttrs)
                    }

                    return Movie.create(movieAttrs);
                })
                .then((movie) => resolve(movie));
        });
    }

    private saveTvShow(showTmdb: TmdbTvShow): Promise<MovieInstance> {
        return new Promise((resolve, reject) => {
            const imdbId = get(showTmdb, 'external_ids.imdb_id') as string;
            const avgRuntime = sum(showTmdb.episode_run_time) ? (sum(showTmdb.episode_run_time)/showTmdb.episode_run_time.length) : null;

            const movieAttrs: MovieAttribute = {
                tmdb_id: showTmdb.id,
                type: 'TV',
                release_date: showTmdb.first_air_date || null,
                tmdb_popularity: showTmdb.popularity,
                backdrop: showTmdb.backdrop_path,
                poster: showTmdb.poster_path,
                title: showTmdb.name,
                description: showTmdb.overview,
                imdb_id: imdbId ? parseInt(imdbId.substr(2)) : null,
                runtime: avgRuntime,
                status: showTmdb.status
            };

            Movie
                .findOne({
                    where: {
                        tmdb_id: movieAttrs.tmdb_id,
                        type: movieAttrs.type
                    }
                })
                .then((movie) => {
                    if (movie) {
                        return movie.update(movieAttrs)
                    }

                    return Movie.create(movieAttrs);
                })
                .then((movie) => {
                    resolve(movie);
                });
        });
    }

    private savePerson(personTmdb: TmdbPersonFull): Promise<PersonInstance> {
        return new Promise((resolve, reject) => {
            const personAttrs: PersonAttribute = {
                id: personTmdb.id,
                imdb_id: personTmdb.imdb_id ? parseInt(personTmdb.imdb_id.substr(2)) : null,
                name: personTmdb.name,
                birthday: personTmdb.birthday || null,
                deathday: personTmdb.deathday || null,
                biography: personTmdb.biography,
                gender: personTmdb.gender,
                profile_path: personTmdb.profile_path,
                place_of_birth: personTmdb.place_of_birth,
                tmdb_popularity: personTmdb.popularity
            };

            Person
                .findOne({
                    where: {
                        id: personAttrs.id
                    }
                })
                .then((person) => {
                    if (person) {
                        return person.update(personAttrs)
                    }

                    return Person.create(personAttrs);
                })
                .then((person) => resolve(person));
        });
    }

}

export const tmdbWorker = new TMDBWorker();
