/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('movies', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    tmdb_id: {
      type: DataTypes.INTEGER(7).UNSIGNED,
      allowNull: false
    },
    imdb_id: {
      type: DataTypes.INTEGER(9),
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('MOVIE','TV'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(2048),
      allowNull: true
    },
    runtime: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    release_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    poster: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    backdrop: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tmdb_popularity: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    tableName: 'movies'
  });
};
