import DbService from '../services/db-service';

export interface ITableData {
    [propName: string]: any;
}

export class Table {
    protected   columns:    string[];
    protected   tableName:  string;
    protected   primary:    string;
    
    static      instance:   any;

    private mapInsertData( data:ITableData[], exclude:string[] ) {
        return data
            .map((item) => {
                return this.columns.filter(col => exclude.indexOf(col) < 0).map(col => (item[col] || item[col] === null || item[col] === false)?item[col]:'');
            });
    }

    public insertCollection( data: ITableData[], exclude:string[] = [], primary:string = '' ):Promise<any> {
        if(!data || !data.length) {
            console.error("Invalid data collection to insert");
            return Promise.resolve(false);
        }

        let primaryValues:any[] = [];

        if(primary)
            primaryValues = data.map(item => item[primary]);

        let fields = this.columns.filter(col => exclude.indexOf(col) < 0);

        return new Promise((resolve, reject) => {
            if (primaryValues.length) {

                DbService.selectByField(this.tableName, primary, primaryValues, [primary]).then((existingRows:any[]) => {
                    if (existingRows.length) {
                        existingRows = existingRows.map(item => item[primary]);

                        let insertData = data.filter( item  => existingRows.indexOf( item[primary] ) < 0);
                        insertData = this.mapInsertData( insertData, exclude );

                        if(!insertData.length)
                            return resolve([]);

                        resolve( DbService.insert(this.tableName, fields, insertData) );
                    } else {
                        resolve( DbService.insert(this.tableName, fields, this.mapInsertData( data, exclude )) );
                    }
                });
            } else {
                resolve( DbService.insert(this.tableName, fields, this.mapInsertData( data, exclude )) );
            }
        });
    }
    
    public getCollection(offset:number = 0, limit:number = 10, include:string[]):Promise<ITableData[]> {
        if(!include.every(col => this.columns.indexOf(col) >= 0)) include = [];

        return DbService.select(this.tableName, offset, limit, include);
    }

    public updateRow( data:ITableData, primaryValue:any ):Promise<any> {
        let updateData:Map<string,any> = new Map();

        Object.keys( data )
            .filter( key => this.columns.indexOf( key ) >= 0)
            .forEach( key => updateData.set(key, data[key]) );

        if(!updateData.size || !primaryValue) return Promise.resolve( false );
        
        return new Promise((resolve, reject) => {
            DbService.selectWhere( this.tableName, new Map([[this.primary, primaryValue]]) ).then( (res:any[]) => {
                if(!res.length)
                    return resolve( false );

                resolve( DbService.update(this.tableName, updateData, new Map([[this.primary, primaryValue]])) );
            });
        });
    }

    public countAll():Promise<number> {
        return DbService.countAll(this.tableName);
    }
}

export default Table;