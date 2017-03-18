import {ITableData ,Table} from './table';

export interface IMoviesData extends ITableData {
    id?:number;
    imdb_id?:number;
    title?:string;
    description?:string;
    runtime?:number;
    release_date?:string;
    imdb_rating?:number;
    tomato_rating?:number;
    poster?:string;
    backdrop?:string;
}

class MoviesTable extends Table {
    protected columns = [
        "id",
        "imdb_id",
        "title",
        "description",
        "runtime",
        "release_date",
        "imdb_rating",
        "tomato_rating",
        "poster",
        "backdrop"
    ];

    protected primary = "id";

    protected tableName = "movies";

    public insertCollection( data:IMoviesData[], exclude:string[] = [], primary:string = 'id' ):Promise<any> {
        return super.insertCollection( data, exclude, primary );
    }

    public getCollection(offset:number = 0, limit:number = 10, include:string[]):Promise<IMoviesData[]> {
        return super.getCollection( offset, limit, include );
    }
}

export let Movies =  new MoviesTable();