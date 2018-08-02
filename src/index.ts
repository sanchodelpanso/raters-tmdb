import db from './app.db';
import { schedule } from './app.schedule';

console.log('--- TMDB API Service ---');

process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception', err)
});

db.ready.then(() => {
    console.log('DB connected');

    schedule.runMovieUpdates();
    schedule.runForceMovieUpdates();

}).catch((err) => {
    console.log('FAILED DB connect', err);
});
