export enum State {
    /*
        DB connection states
     */
    DB_READY,
    DB_CONNECT_ERROR,

    /*
        TMDB Worker states
     */
    TMDB_MOVIE_TV_START,
    TMDB_MOVIE_TV_DONE
}