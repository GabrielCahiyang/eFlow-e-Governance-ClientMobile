import fs from 'node:fs';
const base='src/app/features/authentication/';
let source=fs.readFileSync(base+'LoginScreen.tsx','utf8');
if(source.includes('useNativeLogin')){console.log('Login is already split.');process.exit(0);}
const start=source.indexOf('  const [email, setEmail]'),end=source.indexOf('  return (',start),styles=source.indexOf('const s = StyleSheet.create(');
if(start<0||end<0||styles<0)throw new Error('Review changed login boundaries before extracting.');
const body=source.slice(start,end);
const imports=`import {useRef,useState} from 'react';\nimport NetInfo from '@react-native-community/netinfo';\nimport {rememberSession} from '../../../platform/authStorage';\nimport {signInWithAccountProtection} from '../../../core/web/app/features/authentication/services/accountLogin';\nimport {validateLoginFields} from '../../../core/web/app/features/authentication/services/loginValidation';\nimport {supabase} from '../../../platform/supabase';\nimport type {QuickLoginAccount} from '../../../core/web/app/shared/quickLoginAccounts';\n`;
const fields='email,setEmail,password,setPassword,show,setShow,remember,setRemember,busy,error,setError,errors,setErrors,shake,recovery,setRecovery,notice,setNotice,scenarios,setScenarios,selected,setSelected,signIn,reset,openScenarios,markState';
fs.writeFileSync(base+'useNativeLogin.ts',imports+'export function useNativeLogin(){\n'+body+'return{'+fields+'};\n}\n');
fs.writeFileSync(base+'loginStyles.ts',`import {StyleSheet} from 'react-native';\nexport `+source.slice(styles).replace('const s =','const loginStyles ='));
source=source.slice(0,start)+'  const{'+fields+'}=useNativeLogin();\n'+source.slice(end,styles);
source=source.replace(/import \{ useRef, useState \} from "react";\r?\n/,'').replace(/import NetInfo[^;]+;\r?\n/,'').replace(/import \{ rememberSession \}[^;]+;\r?\n/,'').replace(/import \{ signInWithAccountProtection \}[^;]+;\r?\n/,'').replace(/import \{ validateLoginFields \}[^;]+;\r?\n/,'').replace(/import \{ supabase \}[^;]+;\r?\n/,'').replace(/import type \{ QuickLoginAccount \}[^;]+;\r?\n/,'').replace('  StyleSheet,\n','');
source=`import {useNativeLogin} from './useNativeLogin';\nimport {loginStyles as s} from './loginStyles';\n`+source;
fs.writeFileSync(base+'LoginScreen.tsx',source);
console.log('Separated sign-in state, native layout and presentation styles without changing the service calls.');
