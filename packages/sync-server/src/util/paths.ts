import { relative, resolve, sep } from 'node:path';

import { config } from '#load-config';

import type { BrandedId } from './types';

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export type FileId = BrandedId<'file'>;
export type GroupId = BrandedId<'group'>;

export function isValidFileId(id: string): id is FileId {
  return ID_REGEX.test(id);
}

export function isValidGroupId(id: string): id is GroupId {
  return ID_REGEX.test(id);
}

export function getPathForUserFile(fileId: FileId) {
  const userFilesRoot = resolve(config.get('userFiles'));
  const filePath = resolve(userFilesRoot, `file-${fileId}.blob`);
  const relativePath = relative(userFilesRoot, filePath);

  if (relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) {
    throw new Error('User file path escapes user-files directory');
  }

  return filePath;
}

export function getPathForGroupFile(groupId: GroupId) {
  const userFilesRoot = resolve(config.get('userFiles'));
  const filePath = resolve(userFilesRoot, `group-${groupId}.sqlite`);
  const relativePath = relative(userFilesRoot, filePath);

  if (relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) {
    throw new Error('Group file path escapes user-files directory');
  }

  return filePath;
}
