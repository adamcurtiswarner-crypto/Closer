/**
 * Setup for the emulator-backed flow suites.
 *
 * These drive the real web SDK against real emulators over gRPC, with Cloud
 * Functions triggers firing in the background. That is the point of them —
 * and it also means they are the only tests here with genuine non-determinism.
 *
 * `explore.flow` "B answers; the server creates the both-answered completion"
 * fails intermittently, on CI and locally: observed passing, then failing,
 * then passing again on an unchanged tree (2026-11-21). In the CI failure the
 * emulator logged NO `onResponseSubmitted` invocation for B's answer at all,
 * so the test is not waiting on a slow trigger — B's client write does not
 * land. Root cause unknown. Two guesses have already been wrong (emulator
 * cold start, then a CI-only timeout), so this is a MITIGATION, not a fix.
 *
 * A retry keeps one intermittent test from holding CI permanently red, which
 * is its own harm: a red CI nobody trusts is how the rules job sat red for
 * seven days next to a daily production failure that was also ignored.
 *
 * The limit is deliberately 2. A genuine break still fails three times and
 * still goes red. If this ever starts needing all three attempts, that is a
 * signal to stop retrying and go find the cause.
 */
jest.retryTimes(2, { logErrorsBeforeRetry: true });

export {};
