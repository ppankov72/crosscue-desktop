import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { diagnosticTrack } from '@/lib/decksmith/diagnosticTrack';

export default function DiagnosticTrackLoader({ onLoad }) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(false);
  const load=async()=>{
    setLoading(true);
    setError(false);
    try{
      const response=await fetch(diagnosticTrack.url);
      const blob=await response.blob();
      onLoad(new File([blob],diagnosticTrack.filename,{type:blob.type||'audio/mpeg'}));
    }catch{setError(true)}finally{setLoading(false)}
  };
  return <div className="flex items-center gap-1"><button className="metal-button" onClick={load} disabled={loading}><FlaskConical size={14}/>{loading?'LOADING TEST…':'TEST: LOAD B'}</button>{error&&<span className="text-[9px] text-[#d5ad58]">TEST TRACK UNAVAILABLE</span>}</div>;
}