import { State } from './state';
import { mailer } from '../app.mailer';

export const subscribers: Array<{state: State, listner: (...args: any[])=>void}> = [
    {
        state: State.TMDB_MOVIE_TV_DONE,
        listner: ({movies, shows}) => {
            const subject = 'Movies and TV Series were updated.';

            const body = `
                 --------------------------------------------
                | Update Info:
                 --------------------------------------------
                | ${movies} movies were updated;
                 --------------------------------------------
                | ${shows} TV shows were updated;
                 --------------------------------------------
            `;

            mailer.sendToAdmin(subject, body)
                .then(() => console.log(`EMAIL SENT`))
                .catch((err) => console.log(err));
        }
    }
];