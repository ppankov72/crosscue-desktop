export default function SelectionActions({selected,total,onSelectAll,onClear,onDeleteSelected,onDeleteAll,label='TRACKS',allowDelete=true}) {
 return <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#4b4434] pt-2 text-[9px] text-[#a49778]">
  <span>{selected} SELECTED</span><button className="mini-button" disabled={!total} onClick={onSelectAll}>SELECT ALL {label}</button><button className="mini-button" disabled={!selected} onClick={onClear}>CLEAR SELECTION</button>{allowDelete&&<><button className="mini-button" disabled={!selected} onClick={onDeleteSelected}>REMOVE SELECTED</button><button className="mini-button" disabled={!total} onClick={onDeleteAll}>DELETE ALL {label}</button></>}
 </div>;
}