import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
export default function useTrafficFilter(view) {
  const { user } = useAuth();
  const key=`crosscue-traffic-filter:${user?.id||'admin'}:${view}`;
  const [mode,setMode]=useState(()=>{try {const saved=localStorage.getItem(key);return ['all','real','compare'].includes(saved)?saved:'real';} catch {return 'real';}});
  const change=value=>{setMode(value);try {localStorage.setItem(key,value);} catch { /* Storage may be unavailable. */ }};
  return [mode,change];
}