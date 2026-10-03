import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
try{process.loadEnvFile();}catch{/* Production supplies an EnvironmentFile. */}
process.env.NODE_ENV='production';
process.env.HOSTNAME=process.env.APP_HOST??'127.0.0.1';
process.env.UPLOAD_ROOT=resolve(process.env.UPLOAD_ROOT??'.local/uploads');
process.env.MAIL_FILE_ROOT=resolve(process.env.MAIL_FILE_ROOT??'.local/mail');
await import(pathToFileURL(resolve('.next/standalone/server.js')).href);
