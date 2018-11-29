export const config = {
    tmdb: {
        apiKey:     "64395b3231fab521986c7fccf8164311",
        lang:       "en-US"
    },
    db: {
        host:       "localhost",
        database:   "raters_app",
        user:       "root",
        password:   "root",
        port:       3306
    },
    redis: {
        host:       'localhost',
        port:       6379
    },
    mailgun: {
        domain: 'raters.iondigi.com',
        apiKey: 'key-3a105a9f259fd6c5147cea89be3310c2'
    },

    admin: {
        email: ['ratersapp@gmail.com']
    },

    search: {
        host: 'http://admin.ratersapp.com/api/v2'
    }
}
