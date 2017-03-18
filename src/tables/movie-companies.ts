import {ITableData ,Table} from './table';

export interface IMovieCompaniesData extends ITableData {
    movie_id:number;
    company_id:number;
}

class MovieCompaniesTable extends Table {
    protected columns = [
        "movie_id",
        "company_id"
    ];

    protected tableName = "movie_companies";

    public insertCollection( data:IMovieCompaniesData[] ):Promise<any> {
        return super.insertCollection( data );
    }
}

export let MovieCompanies = new MovieCompaniesTable();