import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface CrewAttribute {
    movie_id:       number;
    person_id:      number;
    job?:           string;
}

export interface CrewInstance extends Sequelize.Instance<CrewAttribute>, CrewAttribute {
}

export interface CrewModel extends Sequelize.Model<CrewInstance, CrewAttribute> { }

export const Crew = db.sequelize.define<CrewInstance, CrewAttribute>('crew', {
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
    job: {
        type: Sequelize.STRING(2048),
        allowNull: true
    }
}, {
    tableName: 'crews'
});
