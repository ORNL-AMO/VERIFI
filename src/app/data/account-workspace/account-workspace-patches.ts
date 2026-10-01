import {
  AccountWorkspaceCollectionKey,
  AccountWorkspaceCollectionRecord,
  WorkspacePatchRecord,
  WorkspacePatch
} from './account-workspace.models';

export function upsertWorkspaceRecords<K extends AccountWorkspaceCollectionKey>(
  collection: K,
  records: readonly (AccountWorkspaceCollectionRecord<K> & WorkspacePatchRecord)[]
): WorkspacePatch {
  return {
    collections: [{
      collection,
      upsert: records
    }]
  };
}

export function deleteWorkspaceRecords<K extends AccountWorkspaceCollectionKey>(
  collection: K,
  options: { readonly ids?: readonly number[]; readonly guids?: readonly string[] }
): WorkspacePatch {
  return {
    collections: [{
      collection,
      deleteIds: options.ids,
      deleteGuids: options.guids
    }]
  };
}
