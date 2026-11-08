// Singleton store for the mapping library — mirrors the midiManager pattern.
// CrossCue.jsx and the Mapping Manager both subscribe to this store,
// so activating a profile in the Manager immediately updates the runtime.

import {
  loadLibrary,
  saveLibrary,
  getActiveProfile,
  getRuntimeMappings,
  activateProfile,
  deactivateProfile,
  addProfile,
  updateProfile,
  deleteProfile,
  duplicateProfile,
  updateRuntimeMappings,
  createProfile,
} from './mappingProfile';

class MappingLibraryStore {
  constructor() {
    this.library = loadLibrary();
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.library);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.listeners.forEach(l => l(this.library));
  }

  commit(next) {
    this.library = next;
    saveLibrary(this.library);
    this.emit();
  }

  // ── Queries ──────────────────────────────────
  get activeProfile() {
    return getActiveProfile(this.library);
  }

  getRuntimeMappings() {
    return getRuntimeMappings(this.library);
  }

  // ── Profile operations ───────────────────────
  activate(profileId) {
    this.commit(activateProfile(this.library, profileId));
  }

  deactivate() {
    this.commit(deactivateProfile(this.library));
  }

  add(section, profile) {
    this.commit(addProfile(this.library, section, profile));
  }

  update(profileId, data) {
    this.commit(updateProfile(this.library, profileId, data));
  }

  delete(profileId) {
    this.commit(deleteProfile(this.library, profileId));
  }

  duplicate(profileId) {
    this.commit(duplicateProfile(this.library, profileId));
  }

  duplicateProfile(profileId) {
    return this.duplicate(profileId);
  }

  // ── Runtime mapping update (backward compat for CrossCue.jsx) ──
  // If no active profile exists, auto-create a default "My Custom Mapping".
  updateRuntime(updater) {
    let library = this.library;
    if (!getActiveProfile(library)) {
      const profile = createProfile({
        name: 'My Custom Mapping',
        status: 'experimental',
        author: 'Me',
      });
      library = {
        ...library,
        my: [...library.my, profile],
        activeProfileId: profile.id,
      };
    }
    this.commit(updateRuntimeMappings(library, updater));
  }
}

export const mappingLibraryStore = new MappingLibraryStore();