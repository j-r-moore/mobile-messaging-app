module.exports = (sequelize, DataTypes) => {
    const users = sequelize.define('users', {
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },        
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    });

    return users;
}