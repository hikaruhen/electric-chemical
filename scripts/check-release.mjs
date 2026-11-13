import {readFile,lstat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const policy=JSON.parse(await readFile(new URL('../release-files.json',import.meta.url),'utf8'));
const allowed=new Set(policy.repositoryFiles);
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw Error('No tracked or staged release files.');
for(const file of files){
 if(!allowed.has(file))throw Error(`File outside repository allowlist: ${file}`);
 const url=new URL('../'+file,import.meta.url);
 if(!(await lstat(url)).isFile())throw Error(`Not a regular file: ${file}`);
 const text=await readFile(url,'utf8');
 if(/(?:[A-Z]:[\\/](?:Users|Program Files)|\/Users\/|gh[pousr]_[A-Za-z0-9]{20,})/i.test(text))throw Error(`Local path or credential-like string in ${file}`);
}
for(const file of allowed)if(!files.includes(file))throw Error(`Missing reviewed source file: ${file}`);
console.log(`Repository allowlist and path checks passed: ${files.length} files.`);
