/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('movie_companies', {
    movie_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    company_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    }
  }, {
    tableName: 'movie_companies'
  });
};
