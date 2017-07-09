/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('people', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true
    },
    imdb_id: {
      type: DataTypes.INTEGER(7),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    birthday: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deathday: {
      type: DataTypes.DATE,
      allowNull: true
    },
    biography: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gender: {
      type: DataTypes.INTEGER(1),
      allowNull: true
    },
    place_of_birth: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    profile_path: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'people'
  });
};
