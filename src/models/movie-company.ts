import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface MovieCompanyAttribute {
    movie_id:   number;
    company_id: number;
}

export interface MovieCompanyInstance extends Sequelize.Instance<MovieCompanyAttribute>, MovieCompanyAttribute {
}

export interface MovieCompanyModel extends Sequelize.Model<MovieCompanyInstance, MovieCompanyAttribute> { }

export const MovieCompany: MovieCompanyModel = db.sequelize.define<MovieCompanyInstance, MovieCompanyAttribute>('movie-company', {
    movie_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    company_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    }
}, {
    tableName: 'movie_companies'
});