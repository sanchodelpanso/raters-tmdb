import db from '../app.db';

export namespace RedisStorage {
    export enum DataType {
        Number,
        String
    }

    export abstract class List {
        protected prefix: string = 'raters_worker_storage_';
        protected key: string;
        protected id: string;
        protected type: DataType;

        constructor() {
            this.key = this.prefix + this.id;
        }

        private transformFrom(value: string): any {
            if(this.type === DataType.Number) {
                return Number.parseInt(value);
            }

            if(this.type === DataType.String) {
                return value;
            }
        }

        private transformTo(value: any): string {
            if(this.type === DataType.Number) {
                return `${value}`;
            }

            if(this.type === DataType.String) {
                return value;
            }
        }

        public push(value: any) {
            return new Promise((resolve, reject) => {
                const data = this.transformTo(value);
                db.redis.rpush(this.key, data, (err) => {
                    if (err) return resolve(null);

                    return resolve()
                });
            });
        }

        public shift() {
            return new Promise((resolve, reject) => {
                db.redis.lpop(this.key, (err, value) => {
                    if (err) return resolve(null);

                    const data = this.transformFrom(value);
                    return resolve(data);
                });
            });
        }

        public delete() {
            return new Promise((resolve, reject) => {
                db.redis.del(this.key, err => {
                    if (err) return reject(err);

                    return resolve();
                });
            });
        }

        public get length() {
            return new Promise((resolve, reject) => {
                db.redis.llen(this.key, (err, value) => {
                    if (err) return resolve(null);

                    return resolve(value);
                });
            });
        }
    }

}