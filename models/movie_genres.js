/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('movie_genres', {
    movie_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    genre_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    }
  }, {
    tableName: 'movie_genres'
  });
};
