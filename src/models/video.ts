import * as Sequelize from 'sequelize';
import db from '../app.db';

export interface VideoAttribute {
    id:         string;
    movie_id:   number;
    key:        string;
    name:       string;
}

export interface VideoInstance extends Sequelize.Instance<VideoAttribute>, VideoAttribute {
}

export interface VideoModel extends Sequelize.Model<VideoInstance, VideoAttribute> { }

export const Video: VideoModel = db.sequelize.define<VideoInstance, VideoAttribute>('video', {
    id: {
        type: Sequelize.CHAR(24),
        allowNull: false,
        primaryKey: true
    },
    movie_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false
    },
    key: {
        type: Sequelize.CHAR(16),
        allowNull: false
    },
    name: {
        type: Sequelize.STRING(255),
        allowNull: false
    }
}, {
    tableName: 'videos'
});
