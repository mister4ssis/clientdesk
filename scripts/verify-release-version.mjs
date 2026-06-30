import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(beta|rc)\.(0|[1-9]\d*))?$/;
const releaseTagPattern =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(beta|rc)\.(0|[1-9]\d*))?$/;

export function verifyReleaseVersion({ packageVersion, tagName }) {
  const failures = [];

  if (!semverPattern.test(packageVersion)) {
    failures.push(`package.json version must use SemVer without invalid suffixes: ${packageVersion}`);
  }

  if (tagName) {
    if (!releaseTagPattern.test(tagName)) {
      failures.push(`Release tag must match vX.Y.Z, vX.Y.Z-beta.N or vX.Y.Z-rc.N: ${tagName}`);
    } else if (tagName.slice(1) !== packageVersion) {
      failures.push(
        `Release tag version (${tagName.slice(1)}) must match package.json version (${packageVersion}).`
      );
    }
  }

  return failures;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const tagName = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? process.env.RELEASE_TAG ?? null;
  const failures = verifyReleaseVersion({
    packageVersion: packageJson.version,
    tagName
  });

  if (!tagName) {
    console.log('No release tag detected. Validated package.json version only.');
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }

    process.exitCode = 1;
  } else {
    console.log('Release version verification passed.');
  }
}
