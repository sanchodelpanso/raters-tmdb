let mysql   = require('mysql');
import config from '../config';

interface IDbConfig {
    host:       string;
    database:   string;
    user:       string;
    password:   string;
}

enum InsertRows {
    Single = 0,
    Multiple = 1
}

class DbService {
    private db:any;
    private updateTimer:any;
    
    constructor( dbConfig:IDbConfig ) {
        console.log('init db connection');
        this.db = mysql.createConnection( dbConfig );

        this.db.connect(( error:any ) => {
            if (error)
                throw error;
        });

        this.updateTimer = setInterval(() => {
            this.db.query('SELECT 1');
        }, 5000);
    }

    private query( sql:string, values:any[] = null ) {
        return new Promise((resolve, reject) => {
            this.db.query( sql, values, function (error:any, results:any, fields:any) {
                if (error) {
                    console.error( error );
                    resolve( false );
                }
                resolve( results );
            });
        });
    }

    public selectByField( table:string, field:string, values:any, selectFields:Array<string> = ['*']) {
        let sql = `SELECT ${selectFields.join(',')} FROM ${table} WHERE ${field}`;

        if(Array.isArray( values ))
            sql += ` IN ( '${values.join("','")}' );`;
        else
            sql += ` = '${values}';`;

        return this.query( sql );
    }

    public selectWhere( table:string, clauses:Map<string,any>, selectFields:Array<string> = ['*']) {
        let sql = `SELECT ${selectFields.join(',')} FROM ${table} WHERE `;

        sql += Array.from( clauses ).map( clause => `${clause.shift()}=${clause.shift()}`).join(` AND `);

        return this.query( sql );
    }

    public select( table:string, offset:number, limit:number, selectFields:Array<string> = ['*']) {
        let sql = `SELECT ${selectFields.join(',')} FROM ${table} LIMIT ${offset}, ${limit}`;

        return this.query( sql );
    }
    
    public insert( table:string, fields:string[], values:any[]) {
        let sql = `INSERT INTO ${table} (${fields.join(',')}) VALUES (`;
        let preparedValuesString:string;
        let rows = InsertRows.Multiple;

        values = values.map((val:any) => {
            if(Array.isArray(val))
                return val.map(innerVal => {
                    if(innerVal === null) return 'NULL';
                    else if(innerVal === false || innerVal === true) return innerVal | 0;
                    else return `${this.db.escape(innerVal)}`;
                }).join(',');

            rows = InsertRows.Single;

            if(val === null) return 'NULL';
            else if(val === false || val === true) return val | 0;
            else return `${this.db.escape(val)}`;
        });

        if(rows === InsertRows.Multiple)
            preparedValuesString = values.join('),(');
        else
            preparedValuesString = values.join(',');

        sql += preparedValuesString + `);`;

        return this.query( sql );
    }

    public update( table:string, data:Map<string, any>, clauses:Map<string, any>) {
        let sql:string = `UPDATE ${table} SET ${Array.from(data).map( col => `${col.shift()}=${this.db.escape(col.shift())}`).join(',')} WHERE ${Array.from(clauses).map( col => `${col.shift()}=${this.db.escape(col.shift())}`).join(`,`)}`;

        return this.query( sql );
    }

    public countAll( table:string ):Promise<number> {
        let sql:string = `SELECT COUNT(*) as amount FROM ${table}`;

        return new Promise((resolve, reject) => {
            this.query(sql).then( (res:any) => {
                if(!res) return resolve( -1 );

                resolve( parseInt(res.shift().amount) );
            });
        });
    }

    end() {
        clearInterval( this.updateTimer );
        this.db.end();
    }
}

export default new DbService( config.db );


