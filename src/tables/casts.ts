import {ITableData ,Table} from './table';

export interface ICastsData extends ITableData {
    movie_id:number;
    person_id:number;
    name:string;
}

class CastsTable extends Table {
    protected columns = [
        "movie_id",
        "person_id",
        "name"
    ];

    protected tableName = "casts";

    public insertCollection( data:ICastsData[] ):Promise<any> {
        return super.insertCollection( data );
    }
}

export let Casts = new CastsTable();