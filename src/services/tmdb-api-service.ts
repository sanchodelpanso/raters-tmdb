let request = require( 'request' );

export default class TmdbApiService {

    public static config:any = {
      perPage: 20
    };

    private apiKey:string;
    private baseUrl:string = `https://api.themoviedb.org/3`;

    constructor( apiKey:string ) {
        this.apiKey = apiKey;
    }

    static init( apiKey:string ) {
        return new TmdbApiService( apiKey );
    }

    private discoverMovieUrl( page:number ) {
        return `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=en-US&sort_by=popularity.desc&page=${page}`;
    }

    private movieDetailsUrl( id:number ) {
        return `${this.baseUrl}/movie/${id}?api_key=${this.apiKey}&language=en-US&append_to_response=credits`;
    }

    private personDetailsUrl( id:number ) {
        return `${this.baseUrl}/person/${id}?api_key=${this.apiKey}&language=en-US`;
    }


    public discoverMovies( page:number ):Promise<{movies:any, currentPage:number, totalPages:number}> {
        return new Promise((resolve, reject) => {
            request.get({url: this.discoverMovieUrl(page), json: true}, function (error:any, response:any, body:any) {
                let result = {
                    movies: [] as any[],
                    currentPage:   0,
                    totalPages:  0
                };

                if (error || response.statusCode !== 200) {
                    console.log('error');
                    console.log(error);
                    resolve(result);
                }

                result = {
                    movies: body.results as any[] || [],
                    currentPage:   body.page as number,
                    totalPages:  body.total_pages as number
                };

                resolve( result );
            });
        });
    }

    public getMovieById( id:number ):Promise<any> {
        return new Promise((resolve, reject) => {
            request.get({url: this.movieDetailsUrl(id), json: true}, function (error:any, response:any, body:any) {
                if (error || response.statusCode !== 200)
                    resolve( false );
                
                resolve(body);
            });

        });
    }

    public getPersonById( id:number ):Promise<any> {
        return new Promise((resolve, reject) => {
            request.get({url: this.personDetailsUrl(id), json: true}, function (error:any, response:any, body:any) {
                if (error || response.statusCode !== 200)
                    resolve( false );

                resolve(body);
            });

        });
    }
}
