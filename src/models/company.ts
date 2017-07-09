import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface CompanyAttribute {
    id:    number;
    name:  string;
}

export interface CompanyInstance extends Sequelize.Instance<CompanyAttribute>, CompanyAttribute {
}

export interface CompanyModel extends Sequelize.Model<CompanyInstance, CompanyAttribute> { }

export const Company: CompanyModel = db.sequelize.define<CompanyInstance, CompanyAttribute>('company', {
    id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'companies'
});