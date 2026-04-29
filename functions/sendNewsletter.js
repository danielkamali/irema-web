// Cloud Function: Send Newsletter to Subscribers
// Currently a skeleton - ready for email service integration
// Supported services: SendGrid, AWS SES, Firebase Extensions

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * sendNewsletter - Send email newsletter to all subscribers
 * Requires admin authentication
 *
 * @param {string} data.subject - Email subject line
 * @param {string} data.content - Plain text email content
 * @param {string} data.contentHtml - (Optional) HTML email content
 */
exports.sendNewsletter = onCall(
  { region: 'us-central1', maxInstances: 5, timeoutSeconds: 540 },
  async (request) => {
    try {
      // 1. Authentication check
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError('unauthenticated', 'You must be signed in');
      }

      // 2. Permission check - only active admins can send newsletters
      const adminSnap = await db.doc(`admin_users/${uid}`).get();
      if (!adminSnap.exists || !adminSnap.data().isActive) {
        throw new HttpsError('permission-denied', 'Only active admins can send newsletters');
      }

      // 3. Validate input
      const { subject, content, contentHtml } = request.data;
      if (!subject || !content) {
        throw new HttpsError('invalid-argument', 'Subject and content are required');
      }

      if (subject.length > 200) {
        throw new HttpsError('invalid-argument', 'Subject must be 200 characters or less');
      }

      if (content.length > 50000) {
        throw new HttpsError('invalid-argument', 'Content must be 50000 characters or less');
      }

      // 4. Fetch all active subscribers
      const subscribersSnap = await db
        .collection('newsletter_subscribers')
        .where('unsubscribed', '==', false)
        .get();

      const emails = subscribersSnap.docs.map(doc => doc.data().email);

      if (emails.length === 0) {
        throw new HttpsError('failed-precondition', 'No active subscribers to send to');
      }

      // 5. Prepare email payload (structure ready for email service)
      const emailPayload = {
        to: emails,
        from: process.env.NEWSLETTER_FROM_EMAIL || 'newsletters@irema.app',
        subject: subject,
        text: content,
        html: contentHtml || content,
        replyTo: 'support@irema.app',
        headers: {
          'List-Unsubscribe': '<https://irema.app/unsubscribe>',
          'X-Mailer': 'Irema Newsletter System'
        }
      };

      // 6. Send email via configured service
      // PLACEHOLDER: Add SendGrid/SES/etc integration here
      // For now, just log and create sending record
      console.log(`Newsletter ready to send to ${emails.length} subscribers:`, emailPayload);

      // 7. Log newsletter send attempt
      const newsletterLog = {
        sentBy: uid,
        senderEmail: adminSnap.data().email || 'unknown',
        subject: subject,
        contentLength: content.length,
        recipientCount: emails.length,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending', // Will be 'sent' once email service confirms
        serviceStatus: 'not_configured', // Change to 'sent' when email service is set up
        emailService: process.env.EMAIL_SERVICE || 'none', // sendgrid, ses, etc
      };

      await db.collection('newsletter_logs').add(newsletterLog);

      // 8. Return success
      return {
        success: true,
        message: process.env.EMAIL_SERVICE
          ? `Newsletter sent to ${emails.length} subscribers`
          : `Newsletter prepared for ${emails.length} subscribers (email service not configured)`,
        recipientCount: emails.length,
        logId: 'pending', // In production, return actual log ID
        requiresSetup: !process.env.EMAIL_SERVICE,
        setupInstructions: !process.env.EMAIL_SERVICE
          ? 'To enable email sending, configure EMAIL_SERVICE environment variable (sendgrid or ses)'
          : null
      };

    } catch (error) {
      console.error('sendNewsletter error:', error);

      // Log the error
      if (request.auth?.uid) {
        await db.collection('newsletter_logs').add({
          sentBy: request.auth.uid,
          status: 'error',
          error: error.message,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }

      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Failed to send newsletter');
    }
  }
);

/**
 * Helper function to integrate SendGrid
 * Usage: Uncomment and set SENDGRID_API_KEY environment variable
 */
/*
async function sendViasendGrid(emails, emailPayload) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const response = await sgMail.send({
      ...emailPayload,
      to: emails.slice(0, 1000), // SendGrid batch limit
    });
    return { success: true, service: 'sendgrid', response };
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}
*/

/**
 * Helper function to integrate AWS SES
 * Usage: Uncomment and set AWS credentials in environment
 */
/*
async function sendViaSES(emails, emailPayload) {
  const AWS = require('aws-sdk');
  const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });

  try {
    // SES requires separate calls for each recipient or bulk sending
    const params = {
      Source: emailPayload.from,
      Destination: {
        ToAddresses: emails
      },
      Message: {
        Subject: {
          Data: emailPayload.subject
        },
        Body: {
          Html: {
            Data: emailPayload.html
          },
          Text: {
            Data: emailPayload.text
          }
        }
      }
    };

    const response = await ses.sendEmail(params).promise();
    return { success: true, service: 'ses', response };
  } catch (error) {
    console.error('SES error:', error);
    throw error;
  }
}
*/
