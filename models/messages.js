module.exports = (sequelize, DataTypes) => {
    const messages = sequelize.define('messages', {
        message: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });

    return messages;
}