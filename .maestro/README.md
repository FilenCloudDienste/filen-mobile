# Maestro Tests

These are the end-to-end tests for our mobile app, powered by [Maestro](https://maestro.mobile.dev/).

## Running Tests

For full documentation on running Maestro tests, see the [Maestro Docs](https://maestro.mobile.dev/).

Run all tests:
```bash
maestro test .maestro
```
Run only a specific tag:
```bash
maestro test .maestro --include-tags drive
```

## Environment Variables

Most tests require authentication. Set the following environment variables before running tests:

- `EMAIL` — The test account email.
- `PASSWORD` — The test account password.

## Test Suite Tags

Tag | Description
--- | ---
`auth` | Tests related to authentication (login and logout).
`drive` | Tests related to the Drive tab and file system functionality.
`photos` | Tests related to the photo synchronisation feature.
`notes` | Tests related to the Notes feature.
`ios` | Tests that should only run on iOS devices.
`android` | Tests that should only run on Android devices.

Use the `--exclude-tags` option with `ios` or `android` to skip tests that are specific to the other platform. (Universal tests don't have both tags)

## Tips & Known Limitations

- **Parallel Execution:** Tests cannot currently be run in parallel because the cleanup step for Notes deletes all notes in the user account. Running tests concurrently would cause race conditions.  
- **Text Input Reliability:** Use the `input-text-retry.yaml` utility flow when entering text into input fields. This helps ensure input is correctly registered, especially on slower systems where text input can be flaky.