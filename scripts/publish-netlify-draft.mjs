#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const positional = args.filter((arg) => arg !== '--check');
const deployId = positional[0] || process.env.NETLIFY_DEPLOY_ID;
const siteId =
  positional[1] ||
  process.env.NETLIFY_SITE_ID ||
  process.env.NEXT_PUBLIC_NETLIFY_SITE_ID;

if (!deployId || !siteId) {
  console.error(
    'Usage: node scripts/publish-netlify-draft.mjs [--check] <deploy-id> [site-id] (or set NETLIFY_SITE_ID)',
  );
  process.exit(1);
}

function runNetlifyApi(endpoint, data) {
  const result = spawnSync(
    'npx',
    ['netlify', 'api', endpoint, '--data', JSON.stringify(data)],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error(`Could not parse Netlify ${endpoint} response as JSON.`);
    console.error(result.stdout);
    throw error;
  }
}

if (!checkOnly) {
  const published = runNetlifyApi('restoreSiteDeploy', {
    site_id: siteId,
    deploy_id: deployId,
  });

  console.log(
    `Published ${published.id || deployId} to ${published.ssl_url || published.url}`,
  );
}

const site = runNetlifyApi('getSite', { site_id: siteId });
const publishedDeployId = site.published_deploy?.id || site.site_deploy_id;

if (publishedDeployId !== deployId) {
  console.error(
    `Production deploy mismatch: expected ${deployId}, found ${publishedDeployId || 'none'}.`,
  );
  process.exit(1);
}

console.log(
  `Production is on ${publishedDeployId}: ${site.ssl_url || site.url}`,
);
