import { Sequelize } from "sequelize"

if(!process.env.DATABASE_URL) {
    throw new Error("Database URL not specified")
}

const db = new Sequelize(process.env.DATABASE_URL, {
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
}
);

db
.authenticate()
.then(() => {
    console.log('Connection has been established successfully.');
})
.catch(err => {
    console.error('Unable to connect to the database:', err);
});

export default db