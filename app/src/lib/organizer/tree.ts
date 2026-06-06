import type { FolderRow } from "./types";

export interface FolderTreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  children: FolderTreeNode[];
}

// Build a nested tree from the flat folder rows (adjacency list via parent_id).
export function buildFolderTree(folders: FolderRow[]): FolderTreeNode[] {
  const byId = new Map<string, FolderTreeNode>();
  for (const f of folders) byId.set(f.id, { ...f, children: [] });

  const roots: FolderTreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

// True if `maybeAncestorId` is `folderId` itself or one of its ancestors.
// Used to block dropping a folder into its own subtree (which would orphan it).
export function isAncestor(
  folders: FolderRow[],
  maybeAncestorId: string,
  folderId: string,
): boolean {
  const parentById = new Map(folders.map((f) => [f.id, f.parent_id]));
  let cur: string | null | undefined = folderId;
  while (cur) {
    if (cur === maybeAncestorId) return true;
    cur = parentById.get(cur);
  }
  return false;
}
