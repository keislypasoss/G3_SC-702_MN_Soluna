const sql = require('mssql/msnodesqlv8');

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=Je-PC;Database=SolunaDB;Trusted_Connection=yes;'
};

async function getConnection() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to SQL Server successfully');
        return pool;
    } catch (err) {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
    }
}

module.exports = {
    getConnection,
    sql
};
