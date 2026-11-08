/**
 * Id3Frames — ID3 frame ID → field name and description mappings.
 * Used by Id3Parser for both ID3v2.2 (3-char) and ID3v2.3/v2.4 (4-char) frames.
 */

// Text frame ID → metadata field name
export const TEXT_FRAMES = {
  // ID3v2.3/v2.4 (4-char IDs)
  TIT2: 'title',       TPE1: 'artist',      TPE2: 'albumArtist', TALB: 'album',
  TRCK: 'track',       TPOS: 'disc',         TCON: 'genre',        TDRC: 'date',
  TYER: 'year',        TCOM: 'composer',     TBPM: 'bpm',          TKEY: 'key',
  TSSE: 'encoder',     TCOP: 'copyright',    TPUB: 'publisher',    TSRC: 'isrc',
  TENC: 'encodedBy',   TLAN: 'language',     TIT3: 'subtitle',     TPE4: 'remixer',
  TPE3: 'conductor',   TIT1: 'grouping',
  // ID3v2.2 (3-char IDs)
  TT2: 'title',        TP1: 'artist',        TP2: 'albumArtist',  TAL: 'album',
  TRK: 'track',        TPA: 'disc',          TCO: 'genre',         TYE: 'year',
  TCM: 'composer',     TBP: 'bpm',           TKE: 'key',           TSS: 'encoder',
  TCR: 'copyright',
};

// Frame ID → human-readable description (for diagnostics)
export const FRAME_DESCRIPTIONS = {
  TIT2: 'Title', TPE1: 'Artist', TPE2: 'Album Artist', TALB: 'Album',
  TRCK: 'Track', TPOS: 'Disc', TCON: 'Genre', TDRC: 'Recording Date',
  TYER: 'Year', TCOM: 'Composer', TBPM: 'BPM', TKEY: 'Initial Key',
  COMM: 'Comment', USLT: 'Unsynchronised Lyrics', APIC: 'Artwork',
  TSSE: 'Encoder', TCOP: 'Copyright', TPUB: 'Publisher', TSRC: 'ISRC',
  TENC: 'Encoded By', TLAN: 'Language', TIT3: 'Subtitle', TPE4: 'Remixer',
  TPE3: 'Conductor', TIT1: 'Grouping', POPM: 'Popularimeter',
  TXXX: 'Custom', WXXX: 'URL', UFID: 'Unique File ID',
  // v2.2
  TT2: 'Title', TP1: 'Artist', TP2: 'Album Artist', TAL: 'Album',
  TRK: 'Track', TPA: 'Disc', TCO: 'Genre', TYE: 'Year', TCM: 'Composer',
  TBP: 'BPM', TKE: 'Key', TSS: 'Encoder', TCR: 'Copyright',
  PIC: 'Artwork', COM: 'Comment', TXX: 'Custom',
};

// APIC picture type codes (ID3v2.3/v2.4 spec)
export const PICTURE_TYPES = [
  'Other', '32x32 icon', 'Other icon', 'Front cover', 'Back cover',
  'Leaflet', 'Media (label side)', 'Lead artist', 'Artist', 'Conductor',
  'Band/Orchestra', 'Composer', 'Lyricist', 'Recording location',
  'During recording', 'During performance', 'Movie screen capture',
  'Coloured fish', 'Illustration', 'Band logo', 'Publisher logo',
];

// ID3v1 genre list (first 80 standard genres)
export const ID3V1_GENRES = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge',
  'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B',
  'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska',
  'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient',
  'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical',
  'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel',
  'Noise', 'AlternRock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative',
  'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave',
  'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream',
  'Southern Rock', 'Comedy', 'Cult', 'Gangsta', 'Top 40', 'Christian Rap',
  'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave',
  'Psychadelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal',
  'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll',
  'Hard Rock',
];