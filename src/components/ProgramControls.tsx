import type { Playlist } from '../domain/types';
import {
  asProgram,
  draftProgramUpdate,
  programState,
  savedProgramUpdate,
  savedTimeLabel,
  type ProgramState,
  type ProgramUpdate,
} from '../domain/programs';
import { Icon } from './ui/Icon';

interface ProgramCallbacks {
  onCreateService: () => void;
  onDeleteService: () => void;
  onDuplicateService: () => void;
  onSelectService: (playlistId: string) => void;
  onUpdateService: (updates: ProgramUpdate) => void;
}

interface ProgramSidebarProps extends ProgramCallbacks {
  playlist: Playlist;
  playlists: Playlist[];
  activePlaylistId: string;
}

interface ProgramHeaderActionsProps {
  playlist: Playlist;
  onDuplicateService: () => void;
  onUpdateService: (updates: ProgramUpdate) => void;
}

function statusLabel(state: ProgramState) {
  if (state === 'saved') return 'SAVED';
  if (state === 'changed') return 'CHANGES';
  if (state === 'archived') return 'ARCHIVED';
  return 'DRAFT';
}

function programDateLabel(program: Playlist) {
  if (program.serviceDate) {
    const date = new Date(`${program.serviceDate}T00:00:00`);
    if (!Number.isNaN(date.valueOf())) {
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return `${program.items.length} item${program.items.length === 1 ? '' : 's'}`;
}

function ProgramListRow({
  program,
  active,
  onOpen,
}: {
  program: Playlist;
  active: boolean;
  onOpen: () => void;
}) {
  const state = programState(program);
  return (
    <button
      className={`programListRow ${active ? 'isActive' : ''}`}
      onClick={onOpen}
      type="button"
      title={program.description || program.title}
    >
      <Icon name="playlist" />
      <span className="programListText">
        <strong>{program.title}</strong>
        <small>{programDateLabel(program)}</small>
      </span>
      <span className={`programState programState-${state}`}>{statusLabel(state)}</span>
    </button>
  );
}

export function ProgramSidebar({
  playlist,
  playlists,
  activePlaylistId,
  onCreateService,
  onDeleteService,
  onDuplicateService,
  onSelectService,
  onUpdateService,
}: ProgramSidebarProps) {
  const activePrograms = playlists.filter((candidate) => !asProgram(candidate).archivedAt);
  const archivedPrograms = playlists.filter((candidate) => Boolean(asProgram(candidate).archivedAt));

  const duplicateAsDraft = () => {
    onDuplicateService();
    onUpdateService(draftProgramUpdate());
  };

  const archiveCurrent = () => {
    if (!window.confirm(`Archive program “${playlist.title}”? You can restore it later.`)) return;
    const replacement = activePrograms.find((candidate) => candidate.id !== playlist.id);
    onUpdateService({ archivedAt: new Date().toISOString() });
    if (replacement) onSelectService(replacement.id);
  };

  const restoreProgram = (programId: string) => {
    onSelectService(programId);
    onUpdateService({ archivedAt: undefined });
  };

  return (
    <section className="programManager" aria-label="Saved programs">
      <div className="programManagerHeader">
        <span>OPEN PROGRAM</span>
        <small>{activePrograms.length}</small>
        <button type="button" onClick={onCreateService}>＋ New Program</button>
      </div>

      <div className="programList">
        {activePrograms.length ? activePrograms.map((program) => (
          <ProgramListRow
            active={program.id === activePlaylistId}
            key={program.id}
            onOpen={() => onSelectService(program.id)}
            program={program}
          />
        )) : (
          <div className="programEmptyState">
            <Icon name="playlist" />
            <span>No active programs</span>
          </div>
        )}
      </div>

      <div className="programManagerActions">
        <button type="button" onClick={duplicateAsDraft}>Duplicate as Draft</button>
        <button type="button" onClick={archiveCurrent}>Archive</button>
        <button className="danger" type="button" disabled={playlists.length <= 1} onClick={onDeleteService}>Delete</button>
      </div>

      {archivedPrograms.length ? (
        <details className="archivedPrograms">
          <summary>
            <span>ARCHIVED</span>
            <small>{archivedPrograms.length}</small>
          </summary>
          <div className="archivedProgramList">
            {archivedPrograms.map((program) => (
              <div className="archivedProgramRow" key={program.id}>
                <button type="button" onClick={() => onSelectService(program.id)}>
                  <Icon name="playlist" />
                  <span>
                    <strong>{program.title}</strong>
                    <small>{programDateLabel(program)}</small>
                  </span>
                </button>
                <button className="restoreProgramButton" type="button" onClick={() => restoreProgram(program.id)}>Restore</button>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function ProgramHeaderActions({
  playlist,
  onDuplicateService,
  onUpdateService,
}: ProgramHeaderActionsProps) {
  const program = asProgram(playlist);
  const state = programState(playlist);

  const saveProgram = () => {
    onUpdateService(savedProgramUpdate(playlist));
  };

  const saveProgramAs = () => {
    const proposed = window.prompt('Save program as', `${playlist.title} Copy`);
    if (proposed === null) return;
    const title = proposed.trim() || `${playlist.title} Copy`;
    onDuplicateService();
    onUpdateService(savedProgramUpdate(playlist, title));
  };

  const duplicateAsDraft = () => {
    onDuplicateService();
    onUpdateService(draftProgramUpdate());
  };

  return (
    <div className="programHeaderActions" aria-label="Program save controls">
      <div className="programSaveState">
        <span className={`programState programState-${state}`}>{statusLabel(state)}</span>
        <small>{state === 'changed' ? 'Changes since explicit save' : savedTimeLabel(program.savedAt)}</small>
      </div>
      <div className="programSaveButtons">
        {state === 'archived' ? (
          <button type="button" onClick={() => onUpdateService({ archivedAt: undefined })}>Restore Program</button>
        ) : (
          <button className="programPrimaryButton" type="button" onClick={saveProgram}>Save Program</button>
        )}
        <button type="button" onClick={saveProgramAs}>Save As…</button>
        <button type="button" onClick={duplicateAsDraft}>Duplicate</button>
      </div>
      <small className="programAutosaveNote">Recovery autosave remains enabled in the background.</small>
    </div>
  );
}
