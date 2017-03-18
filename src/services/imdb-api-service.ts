let request = require( 'request' );

class ImdbApiService {
    private baseUrl:string = `http://omdbapi.com`;

    private movieDetailsUrl( id:number ) {
        if(id.toString().length > 7)
            return false;

        let requestId = "tt0000000";
        requestId = requestId.substr(0, (requestId.length - id.toString().length) ) + id;

        return `${this.baseUrl}/?i=${requestId}&plot=full&r=json&tomatoes=true`;
    }

    public getMovieById( id:number ):Promise<any> {
        return new Promise((resolve, reject) => {
            if(!id) resolve( null );

            request.get({url: this.movieDetailsUrl(id), json: true}, function (error:any, response:any, body:any) {
                if (error || response.statusCode !== 200 || body.Response === 'False')
                    resolve( null );

                resolve(body);
            });

        });
    }
}

export default new ImdbApiService();