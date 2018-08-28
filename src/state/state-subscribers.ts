import { State } from './state';
import { mailer } from '../app.mailer';

export const subscribers: Array<{state: State, listner: (...args: any[])=>void}> = [
    {
        state: State.TMDB_MOVIE_TV_DONE,
        listner: ({movies, shows, people}) => {
            const subject = 'Movies, TV Series and People profiles were updated.';

            const body = `
                 --------------------------------------------
                | Update Info:
                 --------------------------------------------
                | MOVIES:       |   ${movies}
                 --------------------------------------------
                | TV SHOWS      |   ${shows}
                 --------------------------------------------
                | PEOPLE        |   ${people}
                 --------------------------------------------
            `;

            mailer.sendToAdmin(subject, body)
                .then(() => console.log(`EMAIL SENT`))
                .catch((err) => console.log(err));
        }
    }
];
