let mysql   = require('mysql');
let request = require('request');
let ProgressBar = require('progress');

import config from '../config';
import TmdbApiService from '../services/tmdb-api-service';
import ImdbApiService from '../services/imdb-api-service';
import DbService from '../services/db-service';

import { Movies, IMoviesData } from '../tables/movies';
import { People, IPeopleData } from '../tables/people';
import { Companies, ICompaniesData} from '../tables/companies';
import { Casts, ICastsData} from '../tables/casts';
import { Crews, ICrewsData} from '../tables/crews';

import { MovieGenres, IMovieGenresData } from '../tables/movie-genres';
import { MovieCompanies, IMovieCompaniesData } from '../tables/movie-companies';


export default class TmdbParseWorker {
    tmdbService:TmdbApiService;

    constructor() {
        this.tmdbService = TmdbApiService.init( config.tmdb.apiKey );

        Promise.all([
            this.syncMoviesImdb(),
            this.syncPeople()
        ]).then(() => {
            console.log('Done');
            DbService.end();
        });
    }

    saveMovie( movie:any ) {
        return new Promise((resolve, reject) => {
            (async() => {
                await (async() => {

                    if (movie) {
                        let movieData:IMoviesData = {
                            id: movie.id,
                            imdb_id: movie.imdb_id ? movie.imdb_id.substr(2) : null,
                            title: movie.title                  || null,
                            runtime: movie.runtime              || null,
                            description: movie.overview         || null,
                            release_date: movie.release_date    || null,
                            poster: movie.poster_path           || null,
                            backdrop: movie.backdrop_path       || null
                        };

                        await Movies.insertCollection([movieData], ['imdb_rating', 'tomato_rating']);

                        if (movie.credits) {
                            let peopleData:IPeopleData[] = [];

                            if (movie.credits.cast && movie.credits.cast.length) {
                                let casts:ICastsData[] = [];

                                movie.credits.cast.forEach((item:any) => {
                                    peopleData.push({
                                        id: item.id,
                                        name: item.name,
                                        profile_path: item.profile_path || null
                                    } as IPeopleData);

                                    casts.push({
                                        person_id: item.id,
                                        movie_id: movie.id,
                                        name: item.character || null
                                    } as ICastsData);
                                });

                                await Casts.insertCollection(casts);
                            }

                            if (movie.credits.crew && movie.credits.crew.length) {
                                let crews:ICrewsData[] = [];

                                movie.credits.crew.forEach((item:any) => {
                                    peopleData.push({
                                        id: item.id,
                                        name: item.name,
                                        profile_path: item.profile_path || null
                                    } as IPeopleData);

                                    crews.push({
                                        person_id: item.id,
                                        movie_id: movie.id,
                                        job: item.job || null
                                    } as ICrewsData);
                                });

                                await Crews.insertCollection(crews);
                            }

                            let ids = {};
                            peopleData = peopleData.filter(item => ids[item.id] ? false : (ids[item.id] = true));

                            if (peopleData.length)
                                await People.insertCollection(peopleData, ["imdb_id", "birthday", "deathday", "biography", "gender", "place_of_birth"])
                        }

                        let movieGenres:IMovieGenresData[] = [];
                        if (movie.genres && movie.genres.length) {
                            movieGenres = movie.genres.map((item:any) => ({
                                movie_id: movie.id,
                                genre_id: item.id
                            } as IMovieGenresData));

                            await MovieGenres.insertCollection(movieGenres);
                        }

                        let movieCompanies:IMovieCompaniesData[] = [],
                            companies:ICompaniesData[] = [];

                        if (movie.production_companies && movie.production_companies.length) {
                            movie.production_companies.forEach((item:ICompaniesData) => {
                                companies.push({
                                    id: item.id,
                                    name: item.name || null
                                } as ICompaniesData);

                                movieCompanies.push({
                                    movie_id: movie.id,
                                    company_id: item.id
                                } as IMovieCompaniesData);
                            });

                            await Companies.insertCollection(companies);
                            await MovieCompanies.insertCollection(movieCompanies);
                        }
                    }
                })();
                resolve();
            })();

        });
    }

    syncAllMovies() {
        return new Promise((resolve, reject) => {
            let currentId = 1,
                idLimit = 500000;
            
            let interval = setInterval(() => {
                let idRange = [0, 1, 2, 3];
                Promise.all( idRange.map(range => this.tmdbService.getMovieById(currentId + range) ))
                    .then( (movies:any[]) => {
                        (async () => {
                            await (async () => {
                                for(let i = 0;i < movies.length;i++) {
                                    await this.saveMovie( movies[i] );
                                }
                            })();
                        })();
                    });

                currentId += 4;

                if(currentId%100 >=0 && currentId%100 <=3) console.log(currentId);

                if( currentId >= idLimit) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1050);
        });
    }

    syncMoviesImdb() {
        return new Promise((resolve, reject) => {
            (async () => {
                await (async () => {
                    let offset:number = 0, perPage:number = 10, total:number = await Movies.countAll(), progress:number = 0,
                        time = new Date().getTime();

                    while( offset < total ) {
                        let requestQueue:any[] = [],
                            movieIds:IMoviesData[] = await Movies.getCollection(offset, perPage, ["id", "imdb_id"]);

                        if(!movieIds.length) continue;

                        movieIds.forEach( movie => {
                            requestQueue.push({
                                id: movie.id,
                                imdb_id:    movie.imdb_id,
                                movie: null
                            });
                        });

                        let result:any[] = await Promise.all( requestQueue.map(request => ImdbApiService.getMovieById(request.imdb_id) ));

                        requestQueue = requestQueue.map( (request:any, index) => Object.assign(request, {movie: result[index]}));

                        for(let i = 0;i < requestQueue.length;i++){
                            let request = requestQueue[i];

                            if(!request.movie)
                                continue;

                            let updateData:IMoviesData = {
                                imdb_rating: parseFloat( request.movie.imdbRating ) || null,
                                tomato_rating: parseFloat( request.movie.tomatoRating ) || null
                            };

                            await Movies.updateRow( updateData, request.id );
                        }

                        if( progress < (progress = Math.floor(10000 * offset/total)) ) {
                            let eta:any = Math.round((new Date().getTime() - time) * (total - offset) / (offset * 1000));
                            let date = new Date(null);
                            date.setSeconds(eta);
                            eta = date.toISOString().substr(11, 8);

                            console.log(`IMDB sync: ${progress / 100}%, eta: ${eta}`);
                        }

                        offset += perPage;
                    }
                })();
                resolve();
            })();
        });
    }

    syncPeople() {
        return new Promise((resolve, reject) => {
            (async () => {
                await (async () => {
                    let offset:number = 0, perPage:number = 4, total:number = await Movies.countAll(), progress:number = 0,
                        time = new Date().getTime();

                    let interval = setInterval(async () => {
                        let requestQueue:any[] = [],
                            people:IPeopleData[] = await People.getCollection(offset, perPage, ["id"]);

                        if(!people.length) return;
                        people = await Promise.all( people.map(person => this.tmdbService.getPersonById(person.id) ));

                        for(let i = 0;i < people.length;i++){
                            let person = people[i] as any;

                            if(!person)
                                continue;

                            let updateData:IPeopleData = {
                                imdb_id: person.imdb_id?person.imdb_id.substr(2) : null,
                                birthday: person.birthday?(person.birthday.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)?person.birthday:`${person.birthday}-00-00`):null,
                                deathday: person.deathday?(person.deathday.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)?person.deathday:`${person.deathday}-00-00`):null,
                                biography: person.biography             || null,
                                gender: person.gender                   || null,
                                place_of_birth: person.place_of_birth   || null
                            };

                            await People.updateRow( updateData, person.id );
                        }

                        offset += perPage;

                        if( progress < (progress = Math.floor(10000 * offset/total)) ) {
                            let eta:any = Math.round( (new Date().getTime() - time) * (total - offset) / (offset * 1000) );
                            let date = new Date(null);
                            date.setSeconds(eta);
                            eta = date.toISOString().substr(11, 8);

                            console.log(`People sync: ${progress / 100}%, eta: ${eta}`);
                        }

                        if( offset >= total) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 1050);
                })();
            })();
        });
    }
}