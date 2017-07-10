import db from './app.db';
import { tmdbWorker } from './workers/tmdb.worker';

console.log('--- TMDB API Service ---');

process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception', err)
});

db.ready.then(() => {
    console.log('DB connected');

    tmdbWorker.updateMovies();
}).catch((err) => {
    console.log('FAILED DB connect', err);
});