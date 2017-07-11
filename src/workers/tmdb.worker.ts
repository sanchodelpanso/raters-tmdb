import { noop, range, unionWith, unionBy, isEqual, map, get, flatten, includes } from 'lodash';
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
            console.log('DONE MOVIE SYNC');
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

                //TEMP
                const interval = setInterval(() => {
                    const listKey = `${this.storagePrefix}_${key}`;
                    db.redis.llen(listKey, (err, val) => console.log('DATA IN LIST:', val));
                }, 5000);
                //TEMP

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
                            });
                        },
                        noop,
                        () => {
                            console.log('FETCH DONE');
                            console.log('SYNC START');

                            //TEMP
                            clearInterval(interval);
                            //TEMP

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
        const idRange = range(0, 4);

        return new Promise((resolve, reject) => {
            Rx.Observable.interval(1050)
                .switchMap(() => Rx.Observable.fromPromise(Promise.all(idRange.map(() => this.popFromStorage(key)))))
                .map((data: string[]) => data.map(i => parseInt(i)).filter(i => !isNaN(i)))
                .takeWhile((ids: number[]) => ids.length)
                // .do((ids: number[]) => console.time(`GET Movies(${ids.toString()})`))
                .switchMap((ids: number[]) => Rx.Observable.fromPromise(Promise.all(ids.map(id => this.tmdb.getMovieById(id)))))
                .map((movies: TmdbMovie[]) => movies.filter(movie => movie))
                // .do((movies: TmdbMovie[]) => console.timeEnd(`GET Movies(${movies.map(i => i.id).toString()})`))
                .subscribe((movies: TmdbMovie[]) => {
                    console.time(`All data save(${movies.map(i => i.id).toString()})`);

                    StepObservable
                        .of(movies)
                        .subscribe((data) => {
                                const movie = data.value;
                                this.saveMovie(movie)
                                    // .then(() => this.saveMoviePeople(movie))
                                    // .then(() => this.saveMovieGenres(movie))
                                    // .then(() => this.saveMovieCompanies(movie))
                                    .then(() => {
                                        data.next();
                                        /*
                                         TODO: Update state in Redis
                                         */
                                    }).catch(err => console.log(err));
                            },
                            noop,
                            () => {

                                this.saveMoviePeopleCollection(movies)
                                    .then(() => this.saveMovieGenreCollection(movies))
                                    .then(() => this.saveMovieCompanyCollection(movies))
                                    .then(() => {
                                        console.timeEnd(`All data save(${movies.map(i => i.id).toString()})`);
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

    private processId(id: number, type: ProcessingType) {
        return new Promise((resolve, reject) => {
            const key = `id_queue_${type}`;
            let today: moment.Moment = moment();

            this.getRecord(id, type).then((record: MovieInstance) => {
                if (!record || (type === ProcessingType.MOVIE && today.isBefore(record.release_date))) {
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
                if (err) {
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

    private saveMovieCompanyCollection(movies: TmdbMovie[]) {
        const movieIds: number[] = movies.map(m => m.id);

        const movieCompanies: MovieCompanyAttribute[] = flatten(
            movies.map(movie => {
                return map(movie.production_companies, company => {
                    return {
                        movie_id: movie.id,
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

    private saveMovieGenreCollection(movies: TmdbMovie[]) {
        const movieIds: number[] = movies.map(m => m.id);
        const genres: MovieGenreAttribute[] = flatten(
            movies.map((movie) => {
                return map(movie.genres, genre => {
                    return {
                        movie_id: movie.id,
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
            id: data.id,
            name: data.name,
            profile_path: data.profile_path
        }
    }

    private saveMoviePeopleCollection(moviesTmdb: TmdbMovie[]) {
        const movieIds: number[] = moviesTmdb.map(m => m.id);

        const allPeopleCrew = flatten(
            moviesTmdb
                .map(movieTmdb => {
                    const tmdbCrews = get<TmdbMovie, TmdbCrew[]>(movieTmdb, 'credits.crew');
                    return map(tmdbCrews, item => {
                        return {
                            name: item.name,
                            profile_path: item.profile_path,
                            id: item.id,
                            movie_id: movieTmdb.id,
                            job: item.job
                        };
                    });
                })
        );

        const allPeopleCast = flatten(
            moviesTmdb
                .map(movieTmdb => {
                    const tmdbCrews = get<TmdbMovie, TmdbCast[]>(movieTmdb, 'credits.cast');
                    return map(tmdbCrews, item => {
                        return {
                            name: item.name,
                            profile_path: item.profile_path,
                            id: item.id,
                            movie_id: movieTmdb.id,
                            character: item.character
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
                movie_id: item.movie_id,
                job: item.job
            };
        });

        const casts: CastAttribute[] = allPeopleCast.map(item => {
            return {
                person_id: item.id,
                movie_id: item.movie_id,
                name: item.character
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
            .then(() => {
                return Promise.all([
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
            })
            .then(() => Promise.all([Crew.bulkCreate(crews), Cast.bulkCreate(casts)]));
    }

    private saveMovie(movieTmdb: TmdbMovie) {
        return new Promise((resolve, reject) => {
            const movieAttrs: MovieAttribute = {
                tmdb_id: movieTmdb.id,
                type: 'MOVIE',
                release_date: movieTmdb.release_date,
                tmdb_popularity: movieTmdb.popularity,
                backdrop: movieTmdb.backdrop_path,
                poster: movieTmdb.poster_path,
                title: movieTmdb.title,
                description: movieTmdb.overview,
                imdb_id: movieTmdb.imdb_id ? parseInt(movieTmdb.imdb_id.substr(2)) : null,
                runtime: movieTmdb.runtime
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
                .then(() => resolve());

            // Movie.findOrCreate({
            //     where: {
            //         tmdb_id: movieAttrs.tmdb_id,
            //         type: movieAttrs.type
            //     },
            //     defaults: movieAttrs
            // }).spread((movie: MovieInstance, created: boolean) => {
            //     if(!created) {
            //         movie.update(movieAttrs).then(() => resolve());
            //     } else {
            //         resolve();
            //     }
            // });
        });
    }

}

export const tmdbWorker = new TMDBWorker();