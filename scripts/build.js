import {cpSync,mkdirSync,rmSync,existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const config=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(config.outputDirectory,'dist');
for(const file of ['public/index.html','public/app.js','public/style.css','public/favicon.svg','api/router.js','google-auth.mjs','lib/database.js'])assert.ok(existsSync(file),file);
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');cpSync('public','dist',{recursive:true});
console.log('Interface, PDFs e configuração Vercel preparados. API: api/router.js.');
