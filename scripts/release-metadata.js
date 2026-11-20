export const getReleaseMetadata = ({ version, manifestVersion, lockVersion, changelog, tag = 'v' + version }) => {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
      || version.split('.').some((part) => Number(part) > 65535)
      || version === '0.0.0') {
    throw new Error('Use a stable X.Y.Z version compatible with the Chrome manifest.');
  }
  if (manifestVersion !== version || lockVersion !== version) throw new Error('Package, lockfile and manifest versions must match.');
  if (tag !== 'v' + version) throw new Error('Release tag must match the package version: v' + version);

  changelog = changelog.replace(/\r\n/g, '\n');
  const headings = [...changelog.matchAll(/^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?[ \t]*$/gm)];
  const matches = headings.filter((heading) => heading[1] === version);
  if (matches.length !== 1 || !matches[0][2]) throw new Error('Add one dated CHANGELOG.md section for ' + version);
  const heading = matches[0];
  const date = new Date(heading[2]);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== heading[2]) throw new Error('Invalid release date in CHANGELOG.md');
  const end = headings.find((item) => item.index > heading.index)?.index ?? changelog.length;
  const notes = changelog.slice(heading.index + heading[0].length, end).trim();
  const russian = notes.split('### Русский\n')[1]?.split('### English')[0];
  const english = notes.split('### English\n')[1];
  if (!russian || !english || !/^- .+/m.test(russian) || !/^- .+/m.test(english)) {
    throw new Error('Release notes must contain Russian and English changes.');
  }
  return { version, tag, filename: 'more-boosty-' + tag + '.zip', notes: notes + '\n' };
};
