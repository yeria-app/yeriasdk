#!/usr/bin/env ts-node

/**
 * Notification usage example for the YeriaApp SDK
 * Run with: npm run example:notification
 */

import { YeriaApp } from '../src/index';

function header(title: string): void {
    console.log(`\n${title}`);
    console.log('='.repeat(title.length));
}

header('YeriaApp SDK – Notification Example');

// 1. Initialize YeriaApp with platform URL
const yeriaApp = new YeriaApp({
    appId: 'example-app',
    platformUrl: 'https://platform.yeria.com/api/notifications' // Optional: can also pass per-call
});

console.log('✅ YeriaApp ready for notifications');

// 2. Create a basic notification
header('Creating Notifications');

const welcomeNotification = yeriaApp
    .createNotification(
        'user-123',
        'Welcome!',
        'Thank you for joining City-Mate. Get started by completing your profile.'
    )
    .setLink('/welcome');

console.log('✅ Created welcome notification');

// 3. Create notification with link in constructor
const messageNotification = yeriaApp
    .createNotification(
        'user-456',
        'New Message',
        'You have a new message from John Doe',
        '/messages/123'
    );

console.log('✅ Created message notification with link');

// 4. Create notification without link
const reminderNotification = yeriaApp
    .createNotification(
        'user-789',
        'Reminder',
        'Don\'t forget to complete your profile to unlock all features'
    );

console.log('✅ Created reminder notification');

// 5. Sign notifications
header('Signing Notifications');

const signedWelcome = yeriaApp.signNotification(welcomeNotification);
console.log('✅ Signed welcome notification:', {
    appId: signedWelcome.appId,
    timestamp: signedWelcome.timestamp,
    userId: signedWelcome.notification.userId,
    title: signedWelcome.notification.message.title
});

// 6. Send notifications (commented out - requires actual platform endpoint)
header('Sending Notifications');

// Uncomment to actually send (requires valid platform URL):
/*
try {
    await yeriaApp.sendNotification(welcomeNotification);
    console.log('✅ Sent welcome notification');
    
    await yeriaApp.sendNotification(messageNotification);
    console.log('✅ Sent message notification');
    
    await yeriaApp.sendNotification(reminderNotification);
    console.log('✅ Sent reminder notification');
} catch (error) {
    console.error('❌ Failed to send notification:', error);
}
*/

// 7. Manual sending example
header('Manual Notification Sending');

const signedNotification = yeriaApp.signNotification(welcomeNotification);

console.log('Signed notification payload:');
console.log(JSON.stringify(signedNotification, null, 2));

// You can send this manually using your HTTP client:
/*
const response = await fetch('https://platform.yeria.com/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedNotification)
});

if (!response.ok) {
    throw new Error(`Failed to send: ${response.statusText}`);
}
*/

// 8. Dynamic platform URL
header('Dynamic Platform URL');

const yeriaAppNoUrl = new YeriaApp({ appId: 'example-app' });

const dynamicNotification = yeriaAppNoUrl
    .createNotification('user-999', 'Test', 'Testing dynamic URL');

// Override platform URL per call:
/*
await yeriaAppNoUrl.sendNotification(
    dynamicNotification,
    'https://staging.yeria.com/api/notifications'
);
*/

console.log('\n✅ Notification examples completed\n');


