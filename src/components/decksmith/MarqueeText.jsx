import { useEffect, useRef, useState } from 'react';

export default function MarqueeText({children,className,gap='pr-8'}){
  const containerRef=useRef(null),innerRef=useRef(null),[overflow,setOverflow]=useState(false);
  useEffect(()=>{
    const c=containerRef.current;
    if(!c)return;
    const check=()=>{const s=innerRef.current;if(!s)return;setOverflow(s.scrollWidth>c.clientWidth+1);};
    check();
    const ro=new ResizeObserver(check);ro.observe(c);return()=>ro.disconnect();
  },[children]);
  return <div ref={containerRef} className={`relative overflow-hidden ${className||''}`}>
    {overflow?<div className="inline-flex whitespace-nowrap animate-marquee"><span ref={innerRef} className={gap}>{children}</span><span className={gap} aria-hidden>{children}</span></div>:<div ref={innerRef} className="truncate whitespace-nowrap">{children}</div>}
  </div>;
}