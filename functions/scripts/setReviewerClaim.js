const admin = require('firebase-admin');
const path = require('path');

const printUsage = () => {
  console.log([
    'Usage:',
    '  node scripts/setReviewerClaim.js --uid <UID> [--reviewer true|false] [--admin true|false] [--project <PROJECT_ID>] [--service-account <KEY_PATH>]',
    '  node scripts/setReviewerClaim.js --email <EMAIL> [--reviewer true|false] [--admin true|false] [--project <PROJECT_ID>] [--service-account <KEY_PATH>]',
    '',
    'Examples:',
    '  node scripts/setReviewerClaim.js --email seth@ablewealth.co --reviewer true --project awm-01-fc016',
    '  node scripts/setReviewerClaim.js --uid abc123 --reviewer false --project awm-01-fc016',
    '  node scripts/setReviewerClaim.js --email seth@ablewealth.co --reviewer true --service-account ~/keys/awm-01-fc016-admin.json'
  ].join('\n'));
};

const parseBoolean = (value, defaultValue) => {
  if (value === undefined) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value: ${value}. Use true or false.`);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) continue;

    const key = current.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
};

const run = async () => {
  const args = parseArgs();

  if (args.help || args.h) {
    printUsage();
    return;
  }

  const uidArg = args.uid;
  const emailArg = args.email;

  if (!uidArg && !emailArg) {
    throw new Error('You must provide either --uid or --email.');
  }

  if (uidArg && emailArg) {
    throw new Error('Provide only one of --uid or --email, not both.');
  }

  if (args.project) {
    process.env.GCLOUD_PROJECT = args.project;
    process.env.GOOGLE_CLOUD_PROJECT = args.project;
  }

  const serviceAccountPath = args['service-account'] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath.replace(/^~(?=$|\/|\\)/, process.env.HOME || '~'));
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const serviceAccount = require(resolvedPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: args.project || serviceAccount.project_id
    });
  } else {
    admin.initializeApp();
  }

  const auth = admin.auth();

  let userRecord;
  if (uidArg) {
    userRecord = await auth.getUser(uidArg);
  } else {
    userRecord = await auth.getUserByEmail(emailArg);
  }

  const reviewer = parseBoolean(args.reviewer, true);
  const setAdminClaim = args.admin !== undefined;
  const adminClaim = setAdminClaim ? parseBoolean(args.admin, false) : undefined;

  const existingClaims = userRecord.customClaims || {};
  const updatedClaims = {
    ...existingClaims,
    reviewer
  };

  if (setAdminClaim) {
    updatedClaims.admin = adminClaim;
  }

  await auth.setCustomUserClaims(userRecord.uid, updatedClaims);

  console.log('Updated custom claims successfully.');
  console.log(JSON.stringify({
    uid: userRecord.uid,
    email: userRecord.email,
    claims: updatedClaims
  }, null, 2));
  console.log('Ask the user to sign out/in or refresh ID token for claim changes to take effect.');
};

run().catch((error) => {
  console.error('Failed to update reviewer claim.');
  console.error(error.message);
  process.exit(1);
});
