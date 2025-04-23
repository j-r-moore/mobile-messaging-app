const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});


const users = require('./models/users.js')(sequelize, Sequelize.DataTypes);
const messages = require('./models/messages.js')(sequelize, Sequelize.DataTypes);





module.exports = { users, messages };