// Copies the production build to the repository root so GitHub Pages serves the React site.
import {cpSync,rmSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url).pathname;
if(existsSync(root+'assets'))rmSync(root+'assets',{recursive:true});
cpSync(new URL('./dist/',import.meta.url).pathname,root,{recursive:true});
console.log('Copied dist/ to repository root');
