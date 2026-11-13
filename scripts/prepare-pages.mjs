import {readFile,writeFile,mkdir,readdir,lstat,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(root,'_site');
if(path.dirname(output)!==path.resolve(root))throw Error('Output must stay inside this project.');
const policy=JSON.parse(await readFile(new URL('../release-files.json',import.meta.url),'utf8'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const allowed=new Set([...policy.siteFiles,'release.json','.nojekyll']);
await mkdir(output,{recursive:true});
for(const item of await readdir(output)){if(!allowed.has(item))throw Error(`Unexpected output file: ${item}. Refusing to package it.`);}
const hashes={};
for(const name of policy.siteFiles){
 if(path.basename(name)!==name)throw Error('Site files must be root-level files.');
 const source=path.join(root,name),target=path.join(output,name);
 if(!(await lstat(source)).isFile())throw Error(`Not a regular source file: ${name}`);
 try{if(!(await lstat(target)).isFile())throw Error(`Not a regular output file: ${name}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 const data=await readFile(source);hashes[name]=createHash('sha256').update(data).digest('hex');await copyFile(source,target);
}
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'release.json'),JSON.stringify({version:pkg.version,commit:process.env.GITHUB_SHA||null,files:hashes},null,2)+'\n');
console.log(`Prepared ${policy.siteFiles.length} runtime files + release.json + .nojekyll in _site/`);
