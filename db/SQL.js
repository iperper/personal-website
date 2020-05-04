const { Client } = require('pg');

const config = {
    connectionString: process.env.DATABASE_URL,
    // SSL should be false for local debuging
    ssl: true
};

class Database {
    constructor(dbConfig) {
        this.client = new Client(dbConfig);
        this.client.connect();
    }

    createQuery(sql) {
        return new Promise((resolve, reject) => {
            this.client.query(sql, (err, res) => {
                if (err) { 
                    reject(err); 
                }
                resolve(res);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.client.end(err => {
                if (err) { reject( err ); }
                resolve();
            });
        });
    }
}

const database = new Database(config);

module.exports = database;
