import * as Sequelize from 'sequelize';
import db from '../app.db';

export type MovieType = 'MOVIE' | 'TV';

export interface MovieAttribute {
    id?:             number;
    tmdb_id:        number;
    imdb_id?:       number;
    type:           MovieType;
    title?:         string;
    description?:   string;
    runtime:        number;
    release_date?:  string;
    poster?:        string;
    backdrop?:      string;
    tmdb_popularity:number;
}

export interface MovieInstance extends Sequelize.Instance<MovieAttribute>, MovieAttribute {
}

export interface MovieModel extends Sequelize.Model<MovieInstance, MovieAttribute> { }

export const Movie: MovieModel = db.sequelize.define<MovieInstance, MovieAttribute>('movie', {
    id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    tmdb_id: {
        type: Sequelize.INTEGER(7).UNSIGNED,
        allowNull: false
    },
    imdb_id: {
        type: Sequelize.INTEGER(9),
        allowNull: true
    },
    type: {
        type: Sequelize.ENUM('MOVIE','TV'),
        allowNull: false
    },
    title: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    description: {
        type: Sequelize.STRING(2048),
        allowNull: true
    },
    runtime: {
        type: Sequelize.INTEGER(4),
        allowNull: true
    },
    release_date: {
        type: Sequelize.DATE,
        allowNull: true
    },
    poster: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    backdrop: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    tmdb_popularity: {
        type: Sequelize.FLOAT,
        allowNull: true
    }
}, {
    tableName: 'movies'
});