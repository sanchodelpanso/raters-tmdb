import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface GenreAttribute {
    id:    number;
    name:  string;
}

export interface GenreInstance extends Sequelize.Instance<GenreAttribute>, GenreAttribute {
}

export interface GenreModel extends Sequelize.Model<GenreInstance, GenreAttribute> { }

export const Genre: GenreModel = db.sequelize.define<GenreInstance, GenreAttribute>('genre', {
    id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING(255),
        allowNull: false
    }
}, {
    tableName: 'genres'
});