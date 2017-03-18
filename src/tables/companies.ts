import {ITableData ,Table} from './table';

export interface ICompaniesData extends ITableData {
    id:number;
    name:string;
}

class CompaniesTable extends Table {
    protected columns = [
        "id",
        "name"
    ];

    protected tableName = "companies";

    public insertCollection( data:ICompaniesData[], exclude:string[] = [], primary:string = 'id' ):Promise<any> {
        return super.insertCollection( data, exclude, primary );
    }
}

export let Companies = new CompaniesTable();