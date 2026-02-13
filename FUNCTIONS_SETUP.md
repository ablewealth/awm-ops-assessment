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
