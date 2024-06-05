// import { Sequelize } from 'sequelize';

// const sequelize = new Sequelize({
//     dialect: 'mysql',
//     dialectModule: require('mysql2'),
//     host: '3.111.92.159',
//     port: 3306,
//     database: 'yovibez_chatbot',
//     username: 'yovibez_chatbot',
//     password: 'IFXx63a2jDyNdf73lf23bfk@ff'
//   });

// export default sequelize;
import { Sequelize } from 'sequelize';
import pg from 'pg';

const sequelize = new Sequelize({
    dialect: 'postgres',
    dialectModule: pg,
    host: 'ep-patient-dew-a4qwbn7j-pooler.us-east-1.aws.neon.tech', 
    port: 5432,
    database: 'verceldb', 
    username: 'default', 
    password: 'iLRzX32vyrDA', 
    ssl: true, 
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false 
        }
    }
});

export default sequelize;

