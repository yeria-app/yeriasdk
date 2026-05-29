#!/usr/bin/env ts-node

/**
 * Logger demonstration - shows different logging modes
 */

import { YeriaApp, ConsoleLogger, ILogger } from '../src/index';

function section(title: string): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(title);
    console.log('='.repeat(60));
}

section('🎯 YeriaApp Logger Architecture Demo');

// ===== Mode 1: Silent (Default - Production) =====
section('Mode 1: Silent Logger (Default - Production)');
console.log('✅ Creating YeriaApp with default logger (SilentLogger)...\n');

const silentApp = new YeriaApp({ appId: 'silent-app' });

const silentForm = silentApp.createFormView('test', 'Test Form')
    .addTextField('name', 'Name', true)
    .submitButton('Submit', 'POST');

const silentResponse = silentApp.serve(silentForm);

console.log('\n✅ View created and served');
console.log('📊 Notice: NO logs appeared (silent in production)');
console.log('📦 Response signature:', silentResponse.signature.substring(0, 32) + '...');

// ===== Mode 2: Console Logger (Development) =====
section('Mode 2: Console Logger - INFO level (Development)');
console.log('✅ Creating YeriaApp with ConsoleLogger (info level)...\n');

const devApp = new YeriaApp({
    appId: 'dev-app',
    logger: new ConsoleLogger('info')
});

console.log('\n✅ Now creating views (watch for logs above)...');
const devForm = devApp.createFormView('dev-form', 'Dev Form')
    .addEmailField('email', 'Email', true)
    .submitButton('Submit', 'POST');

devApp.serve(devForm);

console.log('\n✅ View created and served');
console.log('📊 Notice: Info logs appeared for important operations');

// ===== Mode 3: Debug Level =====
section('Mode 3: Console Logger - DEBUG level');
console.log('✅ Creating YeriaApp with ConsoleLogger (debug level)...\n');

const debugApp = new YeriaApp({
    appId: 'debug-app',
    logger: new ConsoleLogger('debug')
});

console.log('\n✅ Creating views with debug logging...');
const debugForm = debugApp.createFormView('debug-form', 'Debug Form')
    .addTextField('username', 'Username', true)
    .addPasswordField('password', 'Password', 8);

debugApp.serve(debugForm);

console.log('\n✅ View created and served');
console.log('📊 Notice: Debug logs show detailed information');

// ===== Mode 4: Custom Logger =====
section('Mode 4: Custom Logger Implementation');

class CustomLogger implements ILogger {
    private prefix = '[CUSTOM]';

    debug(msg: string, ctx?: Record<string, unknown>): void {
        console.log(`${this.prefix} [DEBUG] ${msg}`, ctx || '');
    }

    info(msg: string, ctx?: Record<string, unknown>): void {
        console.log(`${this.prefix} [INFO] ℹ️  ${msg}`, ctx || '');
    }

    warn(msg: string, ctx?: Record<string, unknown>): void {
        console.log(`${this.prefix} [WARN] ⚠️  ${msg}`, ctx || '');
    }

    error(msg: string, ctx?: Record<string, unknown>): void {
        console.log(`${this.prefix} [ERROR] ❌ ${msg}`, ctx || '');
    }
}

console.log('✅ Creating YeriaApp with custom logger...\n');

const customApp = new YeriaApp({
    appId: 'custom-app',
    logger: new CustomLogger()
});

const customForm = customApp.createFormView('custom', 'Custom')
    .addTextField('name', 'Name', true);

customApp.serve(customForm);

console.log('\n✅ View created with custom logger');
console.log('📊 Notice: Custom formatting with emojis');

// ===== Mode 5: Logger with Field Injection Warning =====
section('Mode 5: Warning Example - Missing Field');

const warnApp = new YeriaApp({
    appId: 'warn-app',
    logger: new ConsoleLogger('warn')
});

const warnForm = warnApp.createFormView('test', 'Test')
    .addTextField('email', 'Email', true);

console.log('\n✅ Attempting to inject data into non-existent field...');
warnForm.injectData({
    email: 'test@example.com',
    nonExistentField: 'some value'  // This will trigger a warning
});

console.log('\n📊 Notice: Warning logged for missing field');

// ===== Summary =====
section('📋 Summary');

console.log(`
✅ Silent Logger (Default):
   - No logs in production
   - Errors only in development
   - Clean, professional SDK behavior

✅ Console Logger (Opt-in):
   - debug, info, warn, error levels
   - Configurable minimum level
   - Perfect for development

✅ Custom Logger (Advanced):
   - Implement ILogger interface
   - Integrate with Sentry, Datadog, Winston, etc.
   - Full control over logging behavior

✅ Backward Compatible:
   - Old Logger singleton still works
   - No breaking changes
   - Gradual migration path

🎯 Recommendation:
   - Production: Use default (SilentLogger)
   - Development: Use ConsoleLogger('info')
   - Enterprise: Inject custom logger for your infrastructure
`);

console.log('\n🎉 Logger demo completed!\n');

