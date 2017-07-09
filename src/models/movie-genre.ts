import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface MovieGenreAttribute {
    movie_id:   number;
    genre_id:   number;
}

export interface MovieGenreInstance extends Sequelize.Instance<MovieGenreAttribute>, MovieGenreAttribute {
}

export interface MovieGenreModel extends Sequelize.Model<MovieGenreInstance, MovieGenreAttribute> { }

export const MovieGenre: MovieGenreModel = db.sequelize.define<MovieGenreInstance, MovieGenreAttribute>('movie-genre', {
    movie_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    genre_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    }
}, {
    tableName: 'movie_genres'
});