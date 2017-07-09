/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('crews', {
    movie_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    person_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    job: {
      type: DataTypes.STRING(2048),
      allowNull: true
    }
  }, {
    tableName: 'crews'
  });
};
