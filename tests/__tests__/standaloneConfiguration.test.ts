import { test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'../..');
test('delivered app configuration cannot install the Expo development launcher',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
 for(const name of ['expo-dev-client','expo-dev-launcher','expo-dev-menu']){
  expect(pkg.dependencies?.[name]).toBeUndefined();
  expect(pkg.devDependencies?.[name]).toBeUndefined();
  expect(lock.packages?.['node_modules/'+name]).toBeUndefined();
 }
 const config=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
 expect(config.android.package).toBe('com.eflow.mobile');
 expect(config.android.versionCode).toBeGreaterThanOrEqual(2);
 expect(config.plugins.map((plugin:unknown)=>Array.isArray(plugin)?plugin[0]:plugin)).not.toContain('expo-dev-client');
});
