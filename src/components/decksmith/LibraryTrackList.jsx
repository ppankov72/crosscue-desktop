import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, ListPlus, MoreVertical } from 'lucide-react';
import TrackContextMenu from './TrackContextMenu';

const fields={title:t=>t.name,artist:t=>t.artist,genre:t=>t.genre};
export const filterTracks=(tracks,query,mode='all')=>{const needle=query.trim().toLowerCase();if(!needle)return tracks;return tracks.filter(track=>{const value=mode==='all'?[track.name,track.artist,track.genre,track.album].join(' '):fields[mode]?.(track)||'';return value.toLowerCase().includes(needle);});};

const sortGetters={title:t=>t.name||'',artist:t=>t.artist||'',album:t=>t.album||'',genre:t=>t.genre||'',bpm:t=>Number(t.bpm)||0,key:t=>t.analysisKeyCamelot||t.key||''};

function LibraryTrackList({tracks,onLoad,favorites,onFavorite,onAdd,onRemove,onDelete,onReconnect,onAuto,onRemoveFromPlaylist,onSongInfo,onEditSong,onRereadTags,onResetEdits,onAssignSampler,selectedIds=[],onToggleSelection,onSelectAll,readOnly=false,showIndex=false}) {
  const [menu,setMenu]=useState(null);
  const [sort,setSort]=useState({key:null,dir:'asc'});
  const bodyRef=useRef(null);
  useEffect(()=>{const close=()=>setMenu(null);window.addEventListener('click',close);return()=>window.removeEventListener('click',close);},[]);
  // Reset scroll only when the set of track IDs changes (view/filter/replace),
  // NOT when individual track data (bpm, analysis status) updates — that was
  // the "elastic band" snapping back to top during analysis/edits.
  const idsKey=tracks.map(t=>t.id).join('\n');
  useEffect(()=>{if(bodyRef.current)bodyRef.current.scrollTop=0;},[idsKey]);
  const sorted=useMemo(()=>{
    if(!sort.key)return tracks;
    const dir=sort.dir==='asc'?1:-1;
    const getter=sortGetters[sort.key];
    return [...tracks].sort((a,b)=>{const av=getter(a),bv=getter(b);if(sort.key==='bpm')return (av-bv)*dir;return String(av).localeCompare(String(bv))*dir;});
  },[tracks,sort]);
  const toggleSort=key=>setSort(s=>s.key===key?{key,dir:s.dir==='asc'?'desc':'asc'}:{key,dir:'asc'});
  const selectable=Boolean(onToggleSelection);
  const allSelected=tracks.length>0&&tracks.every(track=>selectedIds.includes(track.id));
  const removeFile=track=>onDelete?.(track);
  const arrow=key=>sort.key===key?(sort.dir==='asc'?' \u25B2':' \u25BC'):'';
  const headerCls='cursor-pointer select-none hover:text-white';
  return (
    <div ref={bodyRef} className="max-h-[28rem] sm:h-[60rem] sm:min-h-[60rem] sm:max-h-none overflow-x-hidden overflow-y-scroll [scrollbar-gutter:stable]">
      {/* Desktop 7-column header (unchanged on sm and above) */}
      <div className="table-head sticky top-0 z-10 hidden sm:grid min-w-0 grid-cols-[2fr_1.4fr_1.3fr_.7fr_.45fr_.4fr_1.2fr] gap-2 bg-[#1a1916] py-2">
        <span className="flex items-center gap-1">{selectable&&<input aria-label="Select all tracks" type="checkbox" checked={allSelected} onChange={()=>onSelectAll?.(tracks.map(track=>track.id),!allSelected)}/>}<span className={headerCls} onClick={()=>toggleSort('title')}>TITLE{arrow('title')}</span></span>
        <span className={headerCls} onClick={()=>toggleSort('artist')}>ARTIST{arrow('artist')}</span>
        <span className={headerCls} onClick={()=>toggleSort('album')}>ALBUM{arrow('album')}</span>
        <span className={headerCls} onClick={()=>toggleSort('genre')}>GENRE{arrow('genre')}</span>
        <span className={headerCls} onClick={()=>toggleSort('bpm')}>BPM{arrow('bpm')}</span>
        <span className={headerCls} onClick={()=>toggleSort('key')}>KEY{arrow('key')}</span>
        <span>ACTIONS</span>
      </div>

      {/* Mobile compact sort header (< 640px) */}
      <div className="table-head sticky top-0 z-10 flex sm:hidden items-center justify-between gap-2 bg-[#1a1916] py-2 text-xs">
        <span className="flex items-center gap-2">
          {selectable&&<input aria-label="Select all tracks mobile" type="checkbox" checked={allSelected} onChange={()=>onSelectAll?.(tracks.map(track=>track.id),!allSelected)}/>}
          <span className={headerCls} onClick={()=>toggleSort('title')}>TRACK{arrow('title')}</span>
          <span className={headerCls} onClick={()=>toggleSort('artist')}>/ ARTIST{arrow('artist')}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className={headerCls} onClick={()=>toggleSort('bpm')}>BPM{arrow('bpm')}</span>
          <span className={headerCls} onClick={()=>toggleSort('key')}>KEY{arrow('key')}</span>
          <span>LOAD</span>
        </span>
      </div>

      {tracks.length?sorted.map((t,index)=>{
        const keyDisplay=[t.key||t.analysisKey,t.camelot||t.analysisKeyCamelot].filter(Boolean).join(' / ')||'—';
        const bpmDisplay=t.bpm?Number(t.bpm).toFixed(1):'—';
        return (
          <div key={t.id}>
            {/* Desktop 7-column row (unchanged on sm+) */}
            <div draggable={!readOnly} onDragStart={e=>e.dataTransfer.setData('track',t.id)} onDoubleClick={()=>!readOnly&&!t.fileRequired&&onLoad('A',t)} onContextMenu={e=>{if(readOnly)return;e.preventDefault();e.stopPropagation();setMenu({x:e.clientX,y:e.clientY,track:t});}} className="library-row hidden sm:grid min-w-0 grid-cols-[2fr_1.4fr_1.3fr_.7fr_.45fr_.4fr_1.2fr] items-center gap-2">
              <span className="flex min-w-0 items-center gap-1">{selectable&&<input aria-label={'Select '+t.name} type="checkbox" checked={selectedIds.includes(t.id)} onChange={()=>onToggleSelection(t.id)}/>} {showIndex&&<span className="shrink-0 font-mono tabular-nums" aria-label={`Track ${index+1}`}>{index+1}.</span>}<span className="truncate">{t.name}</span>{t.type==='google_drive'&&<span className="ml-1 shrink-0 rounded bg-[#d5ad58]/20 px-1 text-[9px] font-bold text-[#d5ad58]">DRIVE</span>}</span>
              <span className="truncate">{t.artist||'Local Track'}</span>
              <span className="truncate">{t.album||'—'}</span>
              <span className="truncate">{t.genre||'Audio'}</span>
              <span className="flex items-center gap-1">{t.analysisStatus&&<span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${t.analysisStatus==='ready'?'bg-green-500':t.analysisStatus==='analyzing'?'bg-yellow-500 animate-pulse':'bg-red-500'}`}/>}<span>{bpmDisplay}</span></span>
              <span>{keyDisplay}</span>
              <span className="flex gap-1">{!readOnly&&(t.fileRequired?<><span className="text-[10px] font-bold text-[#d5ad58]">FILE REQUIRED</span><label className="mini-button cursor-pointer">RECONNECT<input className="hidden" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" onChange={e=>e.target.files[0]&&onReconnect(t.id,e.target.files[0])}/></label></>:<><button className="mini-button" onClick={()=>onLoad('A',t)}>A</button><button className="mini-button" onClick={()=>onLoad('B',t)}>B</button><button className="mini-button" title="Favorite" onClick={()=>onFavorite(t.id)}><Heart size={11} fill={favorites.includes(t.id)?'currentColor':'none'}/></button>{onAdd&&<button className="mini-button" title="Add to playlist" onClick={()=>onAdd(t.id)}><ListPlus size={11}/></button>}</>)}{onRemove&&<button className="mini-button" onClick={()=>onRemove(t.id)}>REMOVE</button>}{onDelete&&<button className="mini-button" onClick={()=>onDelete(t)}>DELETE</button>}</span>
            </div>

            {/* Mobile touch-friendly row (< 640px): Title, Artist, BPM, Key & large LOAD A / LOAD B buttons */}
            <div className="library-row flex sm:hidden flex-col gap-2 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {selectable&&<input aria-label={'Select '+t.name} type="checkbox" className="mt-1 shrink-0" checked={selectedIds.includes(t.id)} onChange={()=>onToggleSelection(t.id)}/>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {showIndex&&<span className="shrink-0 font-mono text-xs tabular-nums opacity-75">{index+1}.</span>}
                      <span className="truncate text-sm font-bold text-[#f1e5cc]">{t.name}</span>
                      {t.type==='google_drive'&&<span className="shrink-0 rounded bg-[#d5ad58]/20 px-1 text-[9px] font-bold text-[#d5ad58]">DRIVE</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#a49778]">
                      <span className="truncate">{t.artist||'Local Track'}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#d5ad58]">
                        {t.analysisStatus&&<span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${t.analysisStatus==='ready'?'bg-green-500':t.analysisStatus==='analyzing'?'bg-yellow-500 animate-pulse':'bg-red-500'}`}/>}
                        {bpmDisplay} BPM
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#eee1c6]">KEY: {keyDisplay}</span>
                    </div>
                  </div>
                </div>

                {!readOnly&&(
                  <button
                    type="button"
                    aria-label="Track options"
                    onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setMenu({x:Math.max(12,r.left-140),y:r.bottom+4,track:t});}}
                    className="mini-button min-h-[34px] px-2"
                  >
                    <MoreVertical size={14}/>
                  </button>
                )}
              </div>

              {!readOnly&&(
                <div className="flex flex-wrap items-center gap-1.5">
                  {t.fileRequired?(
                    <>
                      <span className="text-[11px] font-bold text-[#d5ad58]">FILE REQUIRED</span>
                      <label className="metal-button min-h-[38px] flex-1 cursor-pointer text-xs">
                        RECONNECT FILE
                        <input className="hidden" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" onChange={e=>e.target.files[0]&&onReconnect(t.id,e.target.files[0])}/>
                      </label>
                    </>
                  ):(
                    <>
                      <button
                        type="button"
                        onClick={()=>onLoad('A',t)}
                        className="metal-button deck-transport min-h-[38px] flex-1 px-3 text-xs font-extrabold tracking-wider"
                      >
                        LOAD A
                      </button>
                      <button
                        type="button"
                        onClick={()=>onLoad('B',t)}
                        className="metal-button deck-transport min-h-[38px] flex-1 px-3 text-xs font-extrabold tracking-wider"
                      >
                        LOAD B
                      </button>
                      <button
                        type="button"
                        title="Favorite"
                        onClick={()=>onFavorite(t.id)}
                        className="mini-button min-h-[38px] px-2.5"
                      >
                        <Heart size={14} fill={favorites.includes(t.id)?'currentColor':'none'}/>
                      </button>
                      {onAdd&&(
                        <button
                          type="button"
                          title="Add to playlist"
                          onClick={()=>onAdd(t.id)}
                          className="mini-button min-h-[38px] px-2.5"
                        >
                          <ListPlus size={14}/>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }):<div className="p-4 text-center text-sm text-[#9d8b69]">No matching tracks in this view.</div>}
      <TrackContextMenu menu={menu} onClose={()=>setMenu(null)} onLoad={onLoad} onAuto={onAuto} onAdd={onAdd} onRemoveFromPlaylist={onRemoveFromPlaylist} onRemoveFile={removeFile} onSongInfo={onSongInfo} onEditSong={onEditSong} onRereadTags={onRereadTags} onResetEdits={onResetEdits} onAssignSampler={onAssignSampler}/>
    </div>
  );
}
export default memo(LibraryTrackList);