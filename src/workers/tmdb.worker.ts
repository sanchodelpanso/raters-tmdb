import { noop, range, unionWith, isEqual, map, get, last } from 'lodash';
import * as moment from 'moment';
const Rx = require('rxjs/Rx');
import 'rxjs/add/operator/filter';

import { TmdbApiService, tmdb, FileMovieResponse } from '../services/tmdb-api-service/tmdb-api-service';
import { state } from '../app.state';
import { Movie, MovieAttribute, MovieInstance, MovieModel, MovieType } from '../models/movie';
import db from '../app.db';
import { TmdbMovie } from '../services/tmdb-api-service/models/movie';
import { TmdbCrew } from '../services/tmdb-api-service/models/crew';
import { TmdbCast } from '../services/tmdb-api-service/models/cast';
import { Person, PersonAttribute } from '../models/person';
import { Crew, CrewAttribute } from '../models/crew';
import { Cast, CastAttribute } from '../models/cast';
import { TmdbCompany } from '../services/tmdb-api-service/models/company';
import { Company, CompanyAttribute } from '../models/company';
import { MovieCompany, MovieCompanyAttribute } from '../models/movie-company';
import { MovieGenre, MovieGenreAttribute } from '../models/movie-genre';
import { GenreAttribute } from '../models/genre';
import { StepObservable } from '../utils/step-observable';


enum ProcessingType {
    MOVIE,
    TV,
    PEOPLE
}

export class TMDBWorker {

    private tmdb: TmdbApiService = tmdb;
    private storagePrefix = 'tmdb_worker';

    public test() {
        this.syncMovies(ProcessingType.MOVIE).then(() => {

        });
    }

    public updateMovies() {
        return new Promise((resolve, reject) => {
            /*
             TODO: handle errors
             */
            console.log('MOVIE UPDATE: START');
            const popularityThreshold = 0.01;
            const key = `id_queue_${ProcessingType.MOVIE}`;

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
                            this.processId(movie.id, ProcessingType.MOVIE).then(() => {
                                line.next();
                                console.log(movie.id);
                            });
                        },
                        noop,
                        () => {
                            console.log('FETCH DONE');
                            console.log('SYNC START');
                            this.syncMovies(ProcessingType.MOVIE).then(() => {
                                console.log('SYNC DONE');
                                resolve();
                            });
                        }
                    );
            });
        });
    }

    private syncMovies(type: ProcessingType) {
        const key = `id_queue_${type}`;
        const idRange = range(0,4);

        return new Promise((resolve, reject) => {
            Rx.Observable.interval(1050)
                .switchMap(() => Rx.Observable.fromPromise(Promise.all(idRange.map(() => this.popFromStorage(key)))))
                .map((data: string[]) => data.filter(i => i).map(i => parseInt(i)))
                .takeWhile((ids: number[]) => ids.length)
                .do((ids: number[]) => console.time(`MOVIE SYNC -- ${last(ids)}`))
                .switchMap((ids: number[]) => Rx.Observable.fromPromise(Promise.all(ids.map(id => this.tmdb.getMovieById(id)))))
                .subscribe((movies: TmdbMovie[]) => {
                    StepObservable
                        .of(movies)
                        .subscribe((data) => {
                            const movie = data.value;
                            this.saveMovie(movie)
                                .then(() => this.saveMoviePeople(movie))
                                .then(() => this.saveMovieCompanies(movie))
                                .then(() => this.saveMovieGenres(movie))
                                .then(() => {
                                    data.next();
                                    /*
                                     TODO: Update state in Redis
                                     */
                                });
                        }, noop, () => console.timeEnd(`MOVIE SYNC -- ${last(movies).id}`));
                }, noop, () => {
                    resolve();
                });
        });
    }

    private popFromStorage(key: string) {
        return new Promise((resolve, reject) => {
            const listKey = `${this.storagePrefix}_${key}`;
            db.redis.lpop(listKey, (err, data) => {
                /*
                 TODO: Error handler
                 */
                resolve(data);
            });
        });
    }

    private processId(id: number, type: ProcessingType) {
        return new Promise((resolve, reject) => {
            const key = `id_queue_${type}`;
            let today: moment.Moment = moment();

            this.getRecord(id, type).then((record: MovieInstance) => {
                if(!record || (type === ProcessingType.MOVIE && today.isBefore(record.release_date))) {
                    this.pushToStorage(key, String(id));

                    resolve();
                }
            });
        });
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
                if(err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private getRecord(id: number, type: ProcessingType) {
        return Movie.findOne({
            where: {
                tmdb_id: id,
                type: 'MOVIE'
            }
        });
    }

    private saveMovieCompanies(movieTmdb: TmdbMovie) {
            const companies: CompanyAttribute[] = map(movieTmdb.production_companies, company => company);

            return Company
                .destroy({
                    where: {
                        id: companies.map(company => company.id)
                    }
                })
                .then(() => Company.bulkCreate(companies))
                .then(() => MovieCompany
                                .destroy({
                                    where: {
                                        movie_id: movieTmdb.id
                                    }
                                })
                ).then(() => MovieCompany
                                .bulkCreate(companies.map(company => {
                                    const movieCompany: MovieCompanyAttribute = {
                                        movie_id: movieTmdb.id,
                                        company_id: company.id
                                    };

                                    return movieCompany;
                                }))
            );

    }

    private saveMovieGenres(movieTmdb: TmdbMovie) {
        const genres: GenreAttribute[] = map(movieTmdb.genres, genre => genre);

        return MovieGenre
            .destroy({
                where: {
                    movie_id: movieTmdb.id
                }
            })
            .then(() => MovieGenre
                            .bulkCreate(genres.map(genre => {
                                const movieGenre: MovieGenreAttribute = {
                                    movie_id: movieTmdb.id,
                                    genre_id: genre.id
                                };

                                return movieGenre;
                            }))
            );

    }

    private savePerson(person: PersonAttribute) {
        return Person.findOrCreate({
            where: {
                id: person.id
            },
            defaults: person
        });
    }

    private saveCompany(company: CompanyAttribute) {
        return Company.findOrCreate({
            where: {
                id: company.id
            },
            defaults: company
        });
    }

    private mapPerson(data: TmdbCrew | TmdbCast): PersonAttribute {
        return {
            id:             data.id,
            name:           data.name,
            profile_path:   data.profile_path
        }
    }

    private saveMoviePeople(movieTmdb: TmdbMovie) {
        const tmdbCrews = get<TmdbMovie, TmdbCrew[]>(movieTmdb, 'credits.crew');
        const tmdbCasts = get<TmdbMovie, TmdbCast[]>(movieTmdb, 'credits.cast');

        const crewPeople = map(tmdbCrews, this.mapPerson);
        const castPeople = map(tmdbCasts, this.mapPerson);
        const people: PersonAttribute[] = unionWith(crewPeople, castPeople, isEqual);

        const crews = map(tmdbCrews, item => {
            const crew: CrewAttribute = {
                person_id: item.id,
                movie_id: movieTmdb.id,
                job: item.job
            };

            return crew;
        });

        const casts = map(tmdbCasts, item => {
            const cast: CastAttribute = {
                person_id: item.id,
                movie_id: movieTmdb.id,
                name: item.name
            };

            return cast;
        });

        return Person
            .destroy({
                where: {
                    id: people.map(person => person.id)
                }
            })
            .then(() => Person.bulkCreate(people))
            .then(() => Promise.all([
                            Crew.destroy({
                                where: {
                                    movie_id: movieTmdb.id
                                }
                            }),
                            Cast.destroy({
                                where: {
                                    movie_id: movieTmdb.id
                                }
                            })
                        ])
            )
            .then(() => Promise.all([Crew.bulkCreate(crews), Cast.bulkCreate(casts)]));
    }

    private saveMovie( movieTmdb: TmdbMovie ) {
        return new Promise((resolve, reject) => {
            const movieAttrs: MovieAttribute = {
                tmdb_id: movieTmdb.id,
                type: 'MOVIE',
                release_date: movieTmdb.release_date,
                tmdb_popularity: movieTmdb.popularity,
                backdrop: movieTmdb.backdrop_path,
                poster: movieTmdb.poster_path,
                title: movieTmdb.original_title,
                description: movieTmdb.overview,
                imdb_id: movieTmdb.imdb_id ? parseInt(movieTmdb.imdb_id.substr(2)) : null,
                runtime: movieTmdb.runtime
            };

            Movie.findOrCreate({
                where: {
                    tmdb_id: movieAttrs.tmdb_id,
                    type: movieAttrs.type
                },
                defaults: movieAttrs
            }).spread((movie: MovieInstance, created: boolean) => {
                if(!created) {
                    movie.update(movieAttrs).then(() => resolve());
                } else {
                    resolve();
                }
            });
        });
    }

}

export const tmdbWorker = new TMDBWorker();