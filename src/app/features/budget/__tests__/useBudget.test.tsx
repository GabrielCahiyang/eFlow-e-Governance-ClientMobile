import{test,expect,jest}from'@jest/globals';
import{render,screen}from'@testing-library/react-native';
import{Text}from'react-native';
import{useBudget}from'../useBudget';
import{supabase}from'../../../../platform/supabase';
jest.mock('../../authentication',()=>({useAuth:()=>({profile:{id:'actor'}})}));
jest.mock('../../../../core/web/app/features/budget/services/budgetService',()=>({fetchDepartmentBudgetBundle:async()=>({requests:[]})}));
jest.mock('expo-crypto',()=>{let serial=0;return{randomUUID:()=>`subscription-${++serial}`};});
jest.mock('../../../../platform/supabase',()=>{const topics=new Map();return{supabase:{channel:jest.fn((name:string)=>{if(topics.has(name))return topics.get(name);let subscribed=false;const channel={on:jest.fn(()=>{if(subscribed)throw new Error('cannot add callbacks after subscribe');return channel;}),subscribe:jest.fn(()=>{subscribed=true;return channel;})};topics.set(name,channel);return channel;}),removeChannel:jest.fn(async()=>{})}};});
function Consumer({label}:{label:string}){const facts=useBudget('office',2026);return <Text>{facts.data?label:'Loading'}</Text>;}
test('a task funding panel and Office Budget can coexist without reusing a subscribed channel',async()=>{const view=await render(<><Consumer label="Task funding ready"/><Consumer label="Office Budget ready"/></>);expect(await screen.findByText('Task funding ready')).toBeOnTheScreen();expect(await screen.findByText('Office Budget ready')).toBeOnTheScreen();const first=jest.mocked(supabase.channel).mock.calls.map(([topic])=>topic);expect(new Set(first).size).toBe(2);await view.unmount();expect(supabase.removeChannel).toHaveBeenCalledTimes(2);await render(<Consumer label="Reopened budget ready"/>);expect(await screen.findByText('Reopened budget ready')).toBeOnTheScreen();const all=jest.mocked(supabase.channel).mock.calls.map(([topic])=>topic);expect(new Set(all).size).toBe(3);});
