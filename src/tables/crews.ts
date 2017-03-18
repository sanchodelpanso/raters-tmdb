import {ITableData ,Table} from './table';

export interface ICrewsData extends ITableData {
    movie_id:number;
    person_id:number;
    job:string;
}

class CrewsTable extends Table {
    protected columns = [
        "movie_id",
        "person_id",
        "job"
    ];

    protected tableName = "crews";

    public insertCollection( data:ICrewsData[] ):Promise<any> {
        return super.insertCollection( data );
    }
}

export let Crews = new CrewsTable();