import { scheduleJob, Job } from 'node-schedule'
import { tmdbWorker } from './workers/tmdb.worker';
import { searchApi } from './services/search-api-service';
import { state } from './state/app.state';
import { State } from './state/state';
import * as moment from 'moment'

export class AppSchedule {

    public runMovieUpdates() {
        const rule = '0 0 14 * * 1'; //Every Monday at 14.00 UTC

        scheduleJob(rule, fireDate => {
            let updatedNumber: any = {
                movies: null,
                shows: null
            };

            const force = Math.ceil(fireDate.getDate() / 7) === 1;

            tmdbWorker.updateTvSeries(force)
                .then(updated =>  {
                    updatedNumber.shows = updated;
                    return tmdbWorker.updateMovies(force);
                })
                .then(updated => {
                    updatedNumber.movies = updated;
                    searchApi.sync();

                    state.emit(State.TMDB_MOVIE_TV_DONE, updatedNumber);
                    console.log('MOVIES & TV UPDATE: DONE');
                });
        });
    }

    public runForceMovieUpdates() {
        let updatedNumber: any = {
            movies: null,
            shows: null
        };

        tmdbWorker.updateTvSeries(true)
            .then(updated =>  {
                updatedNumber.shows = updated;
                return tmdbWorker.updateMovies(true);
            })
            .then(updated => {
                updatedNumber.movies = updated;
                searchApi.sync();

                state.emit(State.TMDB_MOVIE_TV_DONE, updatedNumber);
                console.log('MOVIES & TV UPDATE: DONE');
            });
    }
}

export const schedule = new AppSchedule();
