const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { Resend } = require('resend');

admin.initializeApp();

const resendApiKeySecret = defineSecret('RESEND_API_KEY');
const resendFromEmailSecret = defineSecret('RESEND_FROM_EMAIL');
const reviewerEmailsSecret = defineSecret('REVIEWER_EMAILS');
const reviewAppUrlSecret = defineSecret('REVIEW_APP_URL');

exports.notifySubmissionForReview = onDocumentCreated(
  {
    document: 'artifacts/{appId}/completedAssessments/{submissionDocId}',
    region: 'us-central1',
    retry: true,
    secrets: [
      resendApiKeySecret,
      resendFromEmailSecret,
      reviewerEmailsSecret,
      reviewAppUrlSecret
    ]
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No snapshot data in trigger event.', { eventId: event.id });
      return;
    }

    const db = admin.firestore();
    const submissionRef = snapshot.ref;
    const submission = snapshot.data();

    const eventReceiptRef = submissionRef.collection('notificationEvents').doc(event.id);

    try {
      await eventReceiptRef.create({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        eventId: event.id
      });
    } catch (error) {
      logger.info('Notification event already processed; skipping duplicate send.', {
        eventId: event.id,
        submissionDocPath: submissionRef.path,
        error: error.message
      });
      return;
    }

    const resendApiKey = resendApiKeySecret.value();
    const reviewerEmailsRaw = reviewerEmailsSecret.value();
    const fromEmail = resendFromEmailSecret.value();
    const reviewAppUrl = reviewAppUrlSecret.value();

    const reviewerEmails = reviewerEmailsRaw
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (reviewerEmails.length === 0) {
      throw new Error('REVIEWER_EMAILS did not contain any valid email addresses.');
    }

    const resend = new Resend(resendApiKey);

    const appId = event.params.appId;
    const submissionDocId = event.params.submissionDocId;
    const userId = submission.userId || 'unknown-user';
    const answered = submission.totals?.answered ?? 0;
    const total = submission.totals?.questions ?? 0;
    const completionPercent = submission.totals?.completionPercent ?? 0;
    const reviewUrl = `${reviewAppUrl}${reviewAppUrl.includes('?') ? '&' : '?'}review=1`;

    const subject = `New Ops Assessment Submission: ${userId}`;

    const text = [
      'A new operations assessment has been submitted for review.',
      '',
      `App ID: ${appId}`,
      `Submission ID: ${submission.submissionId || submissionDocId}`,
      `Submitter: ${userId}`,
      `Completion: ${answered}/${total} (${completionPercent}%)`,
      '',
      `Review now: ${reviewUrl}`
    ].join('\n');

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">New operations assessment submitted</h2>
        <p style="margin-top: 0;">A completed assessment is ready for review and analysis.</p>
        <ul style="padding-left: 18px;">
          <li><strong>App ID:</strong> ${appId}</li>
          <li><strong>Submission ID:</strong> ${submission.submissionId || submissionDocId}</li>
          <li><strong>Submitter:</strong> ${userId}</li>
          <li><strong>Completion:</strong> ${answered}/${total} (${completionPercent}%)</li>
        </ul>
        <p>
          <a href="${reviewUrl}" style="display: inline-block; padding: 10px 14px; background: #0f172a; color: white; text-decoration: none; border-radius: 6px;">
            Open Reviewer View
          </a>
        </p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: reviewerEmails,
      subject,
      text,
      html
    });

    if (error) {
      logger.error('Resend failed to send submission notification.', {
        eventId: event.id,
        error
      });
      throw new Error(`Resend send failed: ${error.message || 'unknown error'}`);
    }

    await submissionRef.set(
      {
        notification: {
          reviewerEmails,
          notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastEventId: event.id,
          status: 'sent'
        }
      },
      { merge: true }
    );

    logger.info('Submission review notification sent.', {
      eventId: event.id,
      submissionDocPath: submissionRef.path,
      reviewerCount: reviewerEmails.length
    });
  }
);
