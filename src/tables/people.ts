import {ITableData ,Table} from './table';

export interface IPeopleData extends ITableData {
    id?:number;
    imdb_id?:number;
    name?:string;
    birthday?:string;
    deathday?:string;
    biography?:number;
    gender?:number;
    place_of_birth?:string;
    profile_path?:string;
}

class PeopleTable extends Table {
    protected columns = [
        "id",
        "imdb_id",
        "name",
        "birthday",
        "deathday",
        "biography",
        "gender",
        "place_of_birth",
        "profile_path"
    ];

    protected primary = "id";
    protected tableName = "people";

    public insertCollection( data:IPeopleData[], exclude:string[] = [], primary:string = 'id' ):Promise<any> {
        return super.insertCollection( data, exclude, primary );
    }

    public getCollection(offset:number = 0, limit:number = 10, include:string[]):Promise<IPeopleData[]> {
        return super.getCollection( offset, limit, include );
    }
}

export let People = new PeopleTable();