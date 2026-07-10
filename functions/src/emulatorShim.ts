/**
 * EMULATOR-ONLY shim — a hard no-op in production.
 *
 * The firebase-tools functions-emulator runtime stubs the `firebase-admin`
 * module with a Proxy whose `get` handler returns `value.bind(target)` for
 * plain functions (see Proxied.getOriginal in
 * firebase-tools/lib/emulator/functionsEmulatorRuntime.js). firebase-admin
 * v12's `admin.firestore` service accessor is a prototype-less function, so
 * every emulator access to it comes back as a fresh bound copy WITHOUT its
 * statics — `admin.firestore.FieldValue` is undefined and every trigger
 * write that uses serverTimestamp()/increment() crashes. Deployed functions
 * are unaffected (no proxy in production).
 *
 * Fix: replace the accessor on the ORIGINAL module (the Proxy has no `set`
 * trap, so assignment writes through) with a NAMED function — named function
 * declarations have a `.prototype`, which makes the runtime's isConstructor
 * check return the value as-is, statics intact — and reattach the statics
 * from the un-stubbed `firebase-admin/firestore` entry point.
 *
 * Imported first in index.ts so it runs before any module touches
 * admin.firestore. Used by `npm run test:flows` (the two-client emulator
 * harness) and any local `firebase emulators:start` session.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */

if (process.env.FUNCTIONS_EMULATOR === 'true') {
  try {
    const adminModule = require('firebase-admin');
    // Not stubbed by the runtime (only the package main is) — carries the
    // real statics.
    const firestoreNs = require('firebase-admin/firestore');

    if (!adminModule.firestore.FieldValue) {
      // The bound copy is still callable — capture it before replacing.
      const boundAccessor = adminModule.firestore;

      function firestoreAccessor(this: unknown, app?: any) {
        return app === undefined ? boundAccessor() : boundAccessor(app);
      }
      Object.assign(firestoreAccessor, {
        FieldValue: firestoreNs.FieldValue,
        Timestamp: firestoreNs.Timestamp,
        FieldPath: firestoreNs.FieldPath,
        GeoPoint: firestoreNs.GeoPoint,
      });

      // `firestore` is a getter on FirebaseNamespace.prototype, so plain
      // assignment throws; an OWN property shadows it. The runtime's Proxy
      // has no defineProperty trap, so this lands on the original module,
      // and the proxy's firestore rewrite then returns our prototype-ful
      // function untouched (statics intact).
      Object.defineProperty(adminModule, 'firestore', {
        value: firestoreAccessor,
        configurable: true,
        writable: true,
      });
    }
  } catch (err) {
    // Never let the shim break emulator startup — worst case the original
    // symptom (FieldValue undefined) resurfaces and points here.
    console.error('[emulatorShim] failed to restore admin.firestore statics:', err);
  }
}

export {};
