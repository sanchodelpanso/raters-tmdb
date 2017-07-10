const Sequelize = require('sequelize');
import * as sequelize from 'sequelize';
import * as redis from 'redis';

import { state, State } from './app.state';
import config from './config';

class AppDb {

    public sequelize: sequelize.Sequelize;
    public redis: redis.RedisClient;

    public ready = new Promise((resolve, reject) => {
        state.on(State.DB_READY, () => resolve());
        state.on(State.DB_CONNECT_ERROR, (err) => reject(err));
    });

    constructor() {
        let connected = 0;

        this.sequelize = new Sequelize(config.db.database, config.db.user, config.db.password, {
            host: config.db.host,
            port: config.db.port,
            dialect: 'mysql',
            pool: {
                max: 5,
                min: 0,
                idle: 10000
            },
            logging: false,
            define: {
                timestamps: false
            }
        });

        this.redis = redis.createClient(config.redis.port, config.redis.host);

        this.sequelize
            .authenticate()
            .then(() => {
                connected++;
                if (connected == 2) {
                    state.emit(State.DB_READY);
                }
            })
            .catch((err: Error) => {
                state.emit(State.DB_CONNECT_ERROR, err);
            });

        this.redis.on('connect', function () {
            connected++;
            if (connected == 2) {
                state.emit(State.DB_READY);
            }
        });
    }

}

export default new AppDb();