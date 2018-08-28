import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface PersonAttribute {
    id:             number;
    imdb_id?:       number;
    name:           string;
    birthday?:      string;
    biography?:     string;
    deathday?:      string;
    gender?:        number;
    place_of_birth?:string;
    profile_path:   string;
    tmdb_popularity?: number;
}

export interface PersonInstance extends Sequelize.Instance<PersonAttribute>, PersonAttribute {
}

export interface PersonModel extends Sequelize.Model<PersonInstance, PersonAttribute> { }

export const Person: PersonModel = db.sequelize.define<PersonInstance, PersonAttribute>('person', {
    id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    imdb_id: {
        type: Sequelize.INTEGER(7),
        allowNull: true
    },
    name: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    birthday: {
        type: Sequelize.DATE,
        allowNull: true
    },
    deathday: {
        type: Sequelize.DATE,
        allowNull: true
    },
    biography: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    gender: {
        type: Sequelize.INTEGER(1),
        allowNull: true
    },
    place_of_birth: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    profile_path: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    tmdb_popularity: {
        type: Sequelize.FLOAT,
        allowNull: true
    },
}, {
    tableName: 'people'
});
