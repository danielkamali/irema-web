// Cloud Function: Secure Proxy for Claude API
// Handles chat messages + review translations
// API key never exposed to browser

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const db = admin.firestore();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * callClaudeAPI - Secure server-side proxy for Claude API calls
 * Modes:
 *   - 'chat': Support chat messages (stores in support_chats collection)
 *   - 'translate': Review translation (returns translation only)
 */
exports.callClaudeAPI = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    try {
      // 1. Authentication check
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError('unauthenticated', 'You must be signed in to use this feature');
      }

      // 2. Validate input
      const { mode, message, sessionId, targetLanguage } = request.data;
      if (!mode || !message) {
        throw new HttpsError('invalid-argument', 'Mode and message are required');
      }

      // 3. Rate limiting (max 10 calls per minute per user)
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0];
      const hourKey = `${dateKey}_${now.getUTCHours()}`;
      const rateLimitDoc = doc(db, 'rate_limits', `${uid}_${hourKey}`);

      const rateLimitSnap = await admin.firestore().doc(rateLimitDoc.path).get();
      const callCount = rateLimitSnap.exists ? rateLimitSnap.data().callCount || 0 : 0;

      if (callCount > 10) {
        throw new HttpsError('resource-exhausted', 'Too many requests. Please try again in a few minutes.');
      }

      let assistantMessage;

      // 4. Handle different modes
      if (mode === 'chat') {
        if (!sessionId) {
          throw new HttpsError('invalid-argument', 'sessionId is required for chat mode');
        }

        // Fetch existing chat messages
        const chatDoc = await db.doc(`support_chats/${sessionId}`).get();
        const existingMessages = chatDoc.data()?.messages || [];

        // Build conversation history for Claude
        const conversationHistory = existingMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Call Claude API server-side
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            system: 'You are a helpful support assistant for Irema, a business review platform. Answer user questions concisely and professionally. Help with issues related to reviews, ratings, business profiles, and platform features.',
            messages: [
              ...conversationHistory,
              { role: 'user', content: message }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Claude API error:', error);
          throw new HttpsError('internal', 'Failed to process chat message');
        }

        const result = await response.json();
        assistantMessage = result.content[0].text;

        // Store conversation in Firestore
        const messageTimestamp = admin.firestore.FieldValue.serverTimestamp();

        if (chatDoc.exists) {
          // Append to existing chat
          await db.doc(`support_chats/${sessionId}`).update({
            messages: admin.firestore.FieldValue.arrayUnion(
              { role: 'user', content: message, timestamp: messageTimestamp },
              { role: 'assistant', content: assistantMessage, timestamp: messageTimestamp }
            ),
            updatedAt: messageTimestamp,
          });
        } else {
          // Create new support chat
          await db.doc(`support_chats/${sessionId}`).set({
            userId: uid,
            userEmail: request.auth?.token?.email || 'unknown',
            messages: [
              { role: 'user', content: message, timestamp: messageTimestamp },
              { role: 'assistant', content: assistantMessage, timestamp: messageTimestamp }
            ],
            status: 'open',
            createdAt: messageTimestamp,
            updatedAt: messageTimestamp,
          });
        }

      } else if (mode === 'translate') {
        // Translation mode (no storage, just return translation)
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            system: `Translate the following review to ${targetLanguage || 'English'}. Return ONLY the translation, no explanation or additional text.`,
            messages: [
              { role: 'user', content: message }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Claude API error:', error);
          throw new HttpsError('internal', 'Failed to translate review');
        }

        const result = await response.json();
        assistantMessage = result.content[0].text;

      } else {
        throw new HttpsError('invalid-argument', `Unknown mode: ${mode}`);
      }

      // 5. Update rate limit counter
      await admin.firestore().doc(rateLimitDoc.path).set({
        userId: uid,
        hourKey,
        callCount: callCount + 1,
        resetAt: new Date(now.getTime() + 60 * 60 * 1000), // Reset in 1 hour
      }, { merge: true });

      // 6. Return response
      return {
        success: true,
        message: assistantMessage,
        sessionId: mode === 'chat' ? sessionId : null,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('callClaudeAPI error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'An error occurred processing your request');
    }
  }
);
