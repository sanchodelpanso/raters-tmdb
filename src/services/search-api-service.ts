let request = require( 'request' );

import { config } from '../config';

class SearchApiService {
    private baseUrl:string = config.search.host;

    public syncMovies() {
        const url = `${this.baseUrl}/movie/sync-es`;

        return new Promise((resolve, reject) => {
            request.get({url: url, json: true}, (error:any, response:any, body:any) => {
                if (error || response.statusCode !== 200 || body.Response === 'False')
                    reject(error || response);

                resolve(body);
            });

        });
    }

    public syncPeople() {
        const url = `${this.baseUrl}/people/sync-es`;

        return new Promise((resolve, reject) => {
            request.get({url: url, json: true}, (error:any, response:any, body:any) => {
                if (error || response.statusCode !== 200 || body.Response === 'False')
                    reject(error || response);

                resolve(body);
            });

        });
    }
}

export const searchApi = new SearchApiService();
