import { useStore } from '../store/store';
import type { GroupData } from '../engine/types';
import styles from './GroupPanel.module.css';

export function GroupPanel() {
  const groups = useStore(s => s.groups);
  const createGroup = useStore(s => s.createGroup);

  const groupList = Object.values(groups).sort((a, b) => a.id - b.id);

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <h3>Groups</h3>
        <button className={styles.newBtn} onClick={() => createGroup()}>+ New</button>
      </div>

      {groupList.length === 0 && (
        <p className={styles.noGroups}>No groups yet.</p>
      )}

      {groupList.map(g => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  );
}

function GroupCard({ group }: { group: GroupData }) {
  const players = useStore(s => s.players);
  const groups = useStore(s => s.groups);
  const deleteGroup = useStore(s => s.deleteGroup);
  const addPlayerToGroup = useStore(s => s.addPlayerToGroup);
  const removePlayerFromGroup = useStore(s => s.removePlayerFromGroup);

  const memberNames = group.memberIds
    .map(id => players[id])
    .filter(Boolean);

  const groupedIds = new Set(
    Object.values(groups).flatMap(g => g.memberIds),
  );
  const available = Object.values(players)
    .filter(p => !groupedIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isFull = group.memberIds.length >= 4;

  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHeader}>
        <span>
          <span className={styles.groupName}>{group.name}</span>
          <span className={styles.count}>{group.memberIds.length}/4</span>
        </span>
        <button className={styles.deleteBtn} onClick={() => deleteGroup(group.id)}>×</button>
      </div>

      <div className={styles.members}>
        {memberNames.map(p => (
          <span key={p.id} className={styles.member}>
            {p.name}
            <button
              className={styles.memberRemove}
              onClick={() => removePlayerFromGroup(group.id, p.id)}
            >×</button>
          </span>
        ))}
        {memberNames.length === 0 && (
          <span className={styles.empty}>Empty group</span>
        )}
      </div>

      {!isFull && available.length > 0 && (
        <div className={styles.addRow}>
          <select
            className={styles.addSelect}
            value=""
            onChange={(e) => {
              const id = Number(e.target.value);
              if (!isNaN(id)) addPlayerToGroup(group.id, id);
            }}
          >
            <option value="" disabled>Add player...</option>
            {available.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
