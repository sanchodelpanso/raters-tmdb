import { scheduleJob, Job } from 'node-schedule'
import { tmdbWorker } from './workers/tmdb.worker';
import { searchApi } from './services/search-api-service';
import { state } from './state/app.state';
import { State } from './state/state';

export class AppSchedule {

    public runMovieUpdates() {
        const rule = '0 0 14 * * 1'; //Every Monday at 14.00 UTC

        scheduleJob(rule, async () => {
            let updatedNumber: any = {
                movies: null,
                shows: null,
                people: null
            };

            const force = Math.ceil(new Date().getDate() / 7) === 1;

            updatedNumber.shows = await tmdbWorker.updateTvSeries(force);
            updatedNumber.movies = await tmdbWorker.updateMovies(force);
            updatedNumber.people = await tmdbWorker.updatePeople();

            searchApi.syncMovies();
            searchApi.syncPeople();

            state.emit(State.TMDB_MOVIE_TV_DONE, updatedNumber);
            console.log('MOVIES & TV UPDATE: DONE');
        });
    }

    public async runForceMovieUpdates() {
        let updatedNumber: any = {
            movies: null,
            shows: null,
            people: null
        };

        updatedNumber.shows = await tmdbWorker.updateTvSeries(true);
        updatedNumber.movies = await tmdbWorker.updateMovies(true);
        updatedNumber.people = await tmdbWorker.updatePeople();

        searchApi.syncMovies();
        searchApi.syncPeople();

        state.emit(State.TMDB_MOVIE_TV_DONE, updatedNumber);
        console.log('MOVIES & TV UPDATE: DONE');

    }
}

export const schedule = new AppSchedule();
