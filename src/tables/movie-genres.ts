import {ITableData ,Table} from './table';

export interface IMovieGenresData extends ITableData {
    movie_id:number;
    genre_id:number;
}

class MovieGenresTable extends Table {
    protected columns = [
        "movie_id",
        "genre_id"
    ];

    protected tableName = "movie_genres";

    public insertCollection( data:IMovieGenresData[] ):Promise<any> {
        return super.insertCollection( data );
    }
}

export let MovieGenres = new MovieGenresTable();