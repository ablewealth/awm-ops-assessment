# Submission Notification Setup (Resend + Firebase Functions)

## What this adds

A Cloud Function triggers whenever a new completed submission is created at:

- `artifacts/{appId}/completedAssessments/{submissionDocId}`

It sends a review notification email via Resend and writes notification metadata back to the submission document.

## 1) Install Firebase CLI (if needed)

```bash
npm install -g firebase-tools
```

## 2) Authenticate and choose project

```bash
firebase login
firebase use <your-firebase-project-id>
```

## 3) Set required function secrets

This function expects these environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `REVIEWER_EMAILS` (comma-separated)
- `REVIEW_APP_URL` (your app URL; function appends `?review=1`)

Set them with:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set RESEND_FROM_EMAIL
firebase functions:secrets:set REVIEWER_EMAILS
firebase functions:secrets:set REVIEW_APP_URL
```

When prompted, enter values for each secret.

## 4) Install function dependencies

```bash
npm --prefix functions install
```

## 5) Deploy functions

```bash
firebase deploy --only functions
```

## Notes

- The trigger includes idempotency protection using `notificationEvents/{eventId}` to avoid duplicate emails on retries.
- Notification status is written into the submission doc under `notification`.

## Assign reviewer access

The reviewer UI and Firestore rules require a custom auth claim: `reviewer: true`.

1) Authenticate ADC (one time on your machine)

```bash
gcloud auth application-default login
```

2) Set reviewer claim by email

```bash
npm --prefix functions run set-reviewer -- --email seth@ablewealth.co --reviewer true --project awm-01-fc016
```

3) Remove reviewer claim

```bash
npm --prefix functions run set-reviewer -- --email seth@ablewealth.co --reviewer false --project awm-01-fc016
```

After updating claims, the user must sign out/in (or force token refresh) for access changes to take effect.

### If ADC quota-project errors persist

Use a service account key instead of ADC:

1) Create a service account key in GCP IAM for project `awm-01-fc016` with Firebase Auth Admin permissions.
2) Download the JSON key locally.
3) Run:

```bash
npm --prefix functions run set-reviewer -- --email seth@ablewealth.co --reviewer true --project awm-01-fc016 --service-account /absolute/path/to/service-account.json
```
