import { memo, useEffect, useMemo, useState } from 'react';
import LibraryToolbar from './LibraryToolbar';
import LibraryTrackList, { filterTracks } from './LibraryTrackList';
import PlaylistPanel from './PlaylistPanel';
import SelectionActions from './SelectionActions';
import SongInfoDialog from './SongInfoDialog';
import EditSongDialog from './EditSongDialog';
import { MetadataStore } from '@/lib/crosscue/analysis';
import { readMetadata, createArtworkBlob } from '@/lib/crosscue/metadata';

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};

function Library({tracks,history,onLoad,onAddFiles,onReconnect,onRemoveFromLibrary,playlists,setPlaylists,selected,setSelected,onAutoDJ,onDeleteHistory,onAssignSampler,onUpdateTrack}) {
  const [view,setView]=useState('library'),[query,setQuery]=useState(''),[mode,setMode]=useState('all'),[favorites,setFavorites]=useState(()=>read('crosscue-favorites',localStorage.getItem('decksmith-favorites')?JSON.parse(localStorage.getItem('decksmith-favorites')):[])),[dragging,setDragging]=useState(false),[selectedTracks,setSelectedTracks]=useState([]),[songInfoTrack,setSongInfoTrack]=useState(null),[editSongTrack,setEditSongTrack]=useState(null);

  useEffect(()=>localStorage.setItem('crosscue-favorites',JSON.stringify(favorites)),[favorites]);
  useEffect(()=>setSelectedTracks([]),[view]);

  const toggle=id=>setFavorites(items=>items.includes(id)?items.filter(item=>item!==id):[...items,id]);
  const add=id=>{if(!playlists.length){setView('playlists');return;}const options=playlists.map((p,i)=>`${i+1}. ${p.name}`).join('\n');const choice=prompt(`Add to playlist:\n${options}`,playlists[0].name);const target=playlists.find(p=>p.name===choice)||playlists[Number(choice)-1];if(target)setPlaylists(items=>items.map(p=>p.id===target.id&&!p.trackIds.includes(id)?{...p,trackIds:[...p.trackIds,id]}:p));};
  const removeFromCurrent=id=>setPlaylists(items=>items.map(p=>p.id===selected?{...p,trackIds:p.trackIds.filter(trackId=>trackId!==id)}:p));
  const removeMany=ids=>{if(!ids.length||!window.confirm(`Delete ${ids.length} selected track${ids.length===1?'':'s'} from the Music Library? Original files will not be deleted.`))return;onRemoveFromLibrary(ids);setFavorites(items=>items.filter(id=>!ids.includes(id)));setPlaylists(items=>items.map(p=>({...p,trackIds:p.trackIds.filter(id=>!ids.includes(id))})));setSelectedTracks([]);};
  const remove=track=>removeMany([track.id]);
  const deleteHistory=ids=>{if(!ids.length||!window.confirm(`Delete ${ids.length} history entr${ids.length===1?'y':'ies'}?`))return;onDeleteHistory(ids);setSelectedTracks([]);};

  // Re-read embedded tags from the source file. Does NOT modify acoustic analysis
  // or library overrides. Preserves existing technical info (duration, sample rate,
  // channels) from the previous metadata record since no AudioBuffer is decoded.
  const rereadTags=async track=>{
    if(!track.file||!track.analysisFingerprint)return;
    const fp=track.analysisFingerprint;
    try{
      const newMeta=await readMetadata(track.file);
      const existing=await MetadataStore.getMetadata(fp);
      if(existing?.technical&&newMeta.technical.duration===0){
        newMeta.technical.duration=existing.technical.duration;
        newMeta.technical.bitrate=existing.technical.bitrate;
        newMeta.technical.sampleRate=existing.technical.sampleRate;
        newMeta.technical.channels=existing.technical.channels;
      }
      await MetadataStore.putMetadata(fp,newMeta);
      if(newMeta._artworkData){
        const blob=createArtworkBlob(newMeta._artworkData,newMeta.artwork?.mimeType);
        await MetadataStore.putArtwork(fp,blob);
      }
    }catch(e){console.warn('[Library] Re-read tags failed:',e.message);}
  };

  // Reset library overrides for the track. Restores visible metadata from
  // embedded tags / filename fallback. Does NOT modify acoustic analysis.
  const resetEdits=async track=>{
    if(!track.analysisFingerprint)return;
    const fp=track.analysisFingerprint;
    await MetadataStore.deleteOverrides(fp);
    const meta=await MetadataStore.getMetadata(fp);
    if(meta?.tags){
      onUpdateTrack?.(track.id,{
        name:meta.tags.title||track.name,
        artist:meta.tags.artist||track.artist||'',
        album:meta.tags.album||track.album||'',
        genre:meta.tags.genre||track.genre||'',
      });
    }
  };

  const handleEditSaved=(track,data)=>{onUpdateTrack?.(track.id,data);};

  const drop=e=>{e.preventDefault();setDragging(false);onAddFiles([...e.dataTransfer.files])};
  const historyRows=useMemo(()=>history.map(item=>({id:item.id,name:item.name,artist:`Deck ${item.deck} · ${item.source}`,album:new Date(item.loadedAt).toLocaleString(),genre:'Loaded'})),[history]);
  const playlistTracks=tracks.filter(track=>playlists.find(p=>p.id===selected)?.trackIds.includes(track.id));
  const scope=view==='history'?historyRows:view==='favorites'?tracks.filter(track=>favorites.includes(track.id)):view==='playlists'?playlistTracks:tracks;
  const listed=filterTracks(scope,query,mode);
  const showingHistory=view==='history';
  const toggleSelected=id=>setSelectedTracks(items=>items.includes(id)?items.filter(item=>item!==id):[...items,id]);
  const listProps={onLoad,favorites,onFavorite:toggle,onAdd:add,onDelete:showingHistory?undefined:remove,onReconnect,onAuto:onAutoDJ,onRemoveFromPlaylist:removeFromCurrent,onSongInfo:setSongInfoTrack,onEditSong:setEditSongTrack,onRereadTags:rereadTags,onResetEdits:resetEdits,selectedIds:selectedTracks,onToggleSelection:toggleSelected,onSelectAll:(ids,all)=>setSelectedTracks(all?[...new Set([...selectedTracks,...ids])]:selectedTracks.filter(id=>!ids.includes(id)))};

  return <section onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={drop} className={`library-panel equipment-panel mt-3 overflow-hidden ${dragging?'border-[#d5ad58]':''}`}>
    <LibraryToolbar view={view} onView={setView} query={query} onQuery={setQuery} mode={mode} onMode={setMode} shown={listed.length} total={scope.length} onClearHistory={()=>deleteHistory(historyRows.map(item=>item.id))} onAddFiles={onAddFiles}/>
    {view==='playlists'?<PlaylistPanel playlists={playlists} setPlaylists={setPlaylists} tracks={tracks} selected={selected} setSelected={setSelected} onAdd={add} onLoad={onLoad} favorites={favorites} onFavorite={toggle} onAddFiles={onAddFiles} onReconnect={onReconnect} onRemoveFile={remove} onAuto={onAutoDJ} onSongInfo={setSongInfoTrack} onEditSong={setEditSongTrack} onRereadTags={rereadTags} onResetEdits={resetEdits} query={query} mode={mode} onAssignSampler={onAssignSampler}/>:<><LibraryTrackList tracks={listed} {...listProps} readOnly={showingHistory}/><SelectionActions selected={selectedTracks.length} total={listed.length} onSelectAll={()=>setSelectedTracks(listed.map(item=>item.id))} onClear={()=>setSelectedTracks([])} onDeleteSelected={()=>showingHistory?deleteHistory(selectedTracks):removeMany(selectedTracks)} onDeleteAll={()=>showingHistory?deleteHistory(historyRows.map(item=>item.id)):removeMany(listed.map(item=>item.id))} label={showingHistory?'HISTORY':'TRACKS'}/></>}
    {songInfoTrack&&<SongInfoDialog track={songInfoTrack} onClose={()=>setSongInfoTrack(null)} onEditSong={track=>{setSongInfoTrack(null);setEditSongTrack(track);}} onRereadTags={rereadTags} onResetEdits={resetEdits}/>}
    {editSongTrack&&<EditSongDialog track={editSongTrack} onClose={()=>setEditSongTrack(null)} onSaved={handleEditSaved} onResetEdits={resetEdits}/>}
  </section>;
}

export default memo(Library);