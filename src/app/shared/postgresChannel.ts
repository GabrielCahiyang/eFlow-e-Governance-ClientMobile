import * as Crypto from'expo-crypto';
import{supabase}from'../../platform/supabase';
/** A Postgres listener belongs to one effect lifetime. Broadcast/presence topics
 * are deliberately not changed: those require a shared server topic. */
export function createPostgresChannel(scope:string){
 return supabase.channel(`${scope}:${Crypto.randomUUID()}`);
}
