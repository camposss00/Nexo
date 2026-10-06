import {readFileSync,writeFileSync,mkdirSync,rmSync,cpSync,existsSync} from 'node:fs';
import {subjects,lessons,questions,exams,writing} from './content.mjs';
const content=JSON.stringify({subjects,lessons,questions,exams,writing}).replaceAll('<','\\u003c');
const html=readFileSync('site/index.template.html','utf8').replace('__CONTENT__',content);
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');writeFileSync('dist/index.html',html);
if(existsSync('/workspace'))writeFileSync('/workspace/nexo-site.html',html);
if(existsSync('public/provas'))cpSync('public/provas','dist/provas',{recursive:true});else if(existsSync('provas'))cpSync('provas','dist/provas',{recursive:true});
console.log('Site estático completo criado, sem API, login ou banco de dados.');
