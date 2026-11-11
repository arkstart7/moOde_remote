import { importLibrary, MpdTrackList } from '../src/library/LibraryImporter';
import { libraryStore } from '../src/library/LibraryStore';

function createTrack(path: string, meta: Record<string, string[]>) {
    return {
        path,
        subsong_index: 0,
        length: 180,
        meta,
    };
}

test('trims textual tags and merges entities with equivalent whitespace', () => {
    const mpdLibrary: MpdTrackList = [
        createTrack('first.flac', {
            title: ['  First track  '],
            artist: ['  Track artist  '],
            'album artist': ['  Album artist  '],
            album: ['  Album name  '],
            genre: ['  Rock  '],
            tracknumber: ['1'],
        }),
        createTrack('second.flac', {
            title: ['Second track'],
            artist: ['Track artist'],
            'album artist': ['Album artist'],
            album: ['Album name'],
            genre: ['Rock'],
            tracknumber: ['2'],
        }),
    ];

    const library = importLibrary(mpdLibrary);

    expect(Object.keys(library.albums)).toHaveLength(1);
    expect(Object.keys(library.artists)).toHaveLength(1);
    expect(Object.keys(library.genres)).toHaveLength(1);
    expect(library.tracks['first.flac#0']).toMatchObject({
        title: 'First track',
        artist: 'Track artist',
        albumArtist: 'Album artist',
        album: 'Album name',
        genre: 'Rock',
    });
});

test('sorts albums by their trimmed names', () => {
    const library = importLibrary([
        createTrack('zeta.flac', {
            album: ['  Zeta  '],
            artist: ['Artist'],
            genre: ['Genre'],
            tracknumber: ['1'],
        }),
        createTrack('alpha.flac', {
            album: [' Alpha '],
            artist: ['Artist'],
            genre: ['Genre'],
            tracknumber: ['1'],
        }),
    ]);

    libraryStore.setLibrary(library);

    expect(libraryStore.getAllAlbums().map(album => album.title)).toEqual([
        'Alpha',
        'Zeta',
    ]);
});

test('uses fallbacks after trimming empty tags', () => {
    const library = importLibrary([
        createTrack('empty.flac', {
            artist: ['  Track artist  '],
            'album artist': ['   '],
            genre: ['   '],
        }),
    ]);

    const track = library.tracks['empty.flac#0'];

    expect(track).toMatchObject({
        artist: 'Track artist',
        albumArtist: 'Track artist',
        genre: '?',
    });
});
