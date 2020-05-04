const database = require('./SQL');

class VisitorDB {
    /**
     * Updates Count of Project Page Views, and creates new entries as needed
     **/

    /**
     * Create visitor tables on server start ()
     */
    static async createTables() {
        /* Add code here, and uncomment the appropriate lines in bin/www,
         * to create database tables when starting the application
         */
        try {
            database.createQuery(`CREATE TABLE IF NOT EXISTS visitors ( \
                                    name VARCHAR(255), \
                                    count INT4 );`);
        } catch (e) {
            console.log("Creating visitor table failed");
            throw e;
        }
    }

   /**
     * Check if a user is already in the database or not
     */
    static async projectInDB(proj_name){
        try {
            let response = await database.createQuery(`SELECT * \
                                                FROM visitors \
                                                WHERE name = '${proj_name}';`);
            return (response.rowCount !== 0);
        } catch (e) {
            throw e;
        }
    }

    /**
     * Creates New Row for Project in visitor Table
     */
    static async addProject(proj_name){
        try {
            if (await this.projectInDB(proj_name)){
                throw 'Project already in database';
            }
            else {
                // console.log("Project not in database. Adding")
                let response = await database.createQuery(`INSERT INTO visitors (name, count) \
                                                    VALUES ('${proj_name}', 1);`);
                return response
            }
        } catch (e) {
            throw e;
        }
    }
    
    /**
     * Add a new user
     */
    static async incrementProject(proj_name){
        try {
            // console.log("Incrementing project database");
            let response = await database.createQuery(`UPDATE visitors \
                                                SET count = count + 1 \
                                                WHERE name = '${proj_name}';`);
            return response
        } catch (e) {
            throw e;
        }
    }

    static async updateProject(proj_name){
        try {
            if (await this.projectInDB(proj_name)){
                this.incrementProject(proj_name);
            }
            else {
                this.addProject(proj_name);
            }
        } catch (e) {
            throw e;
        }
    }

    static async getVisitorCounts(){
        try {
            let response = await database.createQuery(`SELECT * FROM visitors;`);
            return response["rows"]
        } catch (e) {
            throw e;
        }
    }
}

module.exports = VisitorDB;
