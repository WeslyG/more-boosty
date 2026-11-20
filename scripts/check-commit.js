import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9][a-z0-9/-]*\))?!?: \S(?:.*\S)?$/;

export const checkCommitMessage = (message, { allowMerge = false } = {}) => {
  const header = message.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
  if (allowMerge && header.startsWith('Merge ')) return;
  if (header.length > 100 || !pattern.test(header)) {
    throw new Error('Use Conventional Commits, max 100 characters: type(scope): short description');
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fromTitle = process.argv[2] === '--pr-title';
  const message = fromTitle ? process.env.PR_TITLE ?? '' : await readFile(process.argv[2], 'utf8');
  try {
    checkCommitMessage(message, { allowMerge: !fromTitle });
    console.log('Conventional Commit header is valid.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
