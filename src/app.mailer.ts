import { config } from './config';
const mailgun = require('mailgun-js');

export class AppMailer {

    private from = `Raters Service Worker<worker@${config.mailgun.domain}>`;
    private mailgun: any/* Mailgun-JS*/;

    constructor() {
        this.mailgun = mailgun({apiKey: config.mailgun.apiKey, domain: config.mailgun.domain});
    }

    public sendToAdmin(subject: string, text: string) {
        const data = {
            from: this.from,
            to: config.admin.email,
            subject: subject,
            text: text
        };

        return new Promise((resolve, reject) => {
            this.mailgun.messages().send(data, (error: any) => {
                if(error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

}

export const mailer = new AppMailer();