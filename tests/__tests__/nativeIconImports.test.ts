import{test,expect}from'@jest/globals';
import fs from'node:fs';
import path from'node:path';
function sourceFiles(folder:string):string[]{return fs.readdirSync(folder,{withFileTypes:true}).flatMap(item=>item.isDirectory()?sourceFiles(path.join(folder,item.name)):/\.tsx?$/.test(item.name)?[path.join(folder,item.name)]:[]);}
test('every native icon import has a real runtime module, including renamed aliases',()=>{
 const missing:string[]=[];
 for(const file of sourceFiles(path.resolve('src/app'))){for(const match of fs.readFileSync(file,'utf8').matchAll(/from\s+['"]lucide-react-native\/icons\/([^'"]+)['"]/g)){if(!fs.existsSync(path.resolve('node_modules/lucide-react-native/dist/esm/icons',match[1]+'.mjs')))missing.push(path.relative(process.cwd(),file)+': '+match[1]);}}
 expect(missing).toEqual([]);
});
