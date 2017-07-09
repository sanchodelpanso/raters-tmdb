import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface CastAttribute {
    movie_id:       number;
    person_id:      number;
    name?:          string;
}

export interface CastInstance extends Sequelize.Instance<CastAttribute>, CastAttribute {
}

export interface CastModel extends Sequelize.Model<CastInstance, CastAttribute> { }

export const Cast: CastModel = db.sequelize.define<CastInstance, CastAttribute>('cast', {
    movie_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    person_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING(2048),
        allowNull: true
    }
}, {
    tableName: 'casts'
});