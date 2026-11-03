const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const firebase = JSON.parse(
  fs.readFileSync(path.join(root, 'google-services.json'), 'utf8'),
);

test('Expo uses the bundled Firebase Android configuration', () => {
  assert.equal(app.android.googleServicesFile, './google-services.json');
  assert.equal(firebase.configuration_version, '1');
  assert.equal(typeof firebase.project_info.project_id, 'string');
  assert.ok(firebase.project_info.project_id.length > 0);
  assert.match(firebase.project_info.project_number, /^\d+$/);
});

test('Firebase has exactly one matching client for the configured Android app', () => {
  assert.equal(app.android.package, 'org.ukonwheels.driver');
  const clients = firebase.client.filter(
    client => client.client_info?.android_client_info?.package_name === app.android.package,
  );
  assert.equal(clients.length, 1);
  const client = clients[0];
  const appId = new RegExp(`^1:${firebase.project_info.project_number}:android:[a-f0-9]+$`);
  assert.ok(appId.test(client.client_info.mobilesdk_app_id));
  // Report only a boolean, never print client key values in test output.
  assert.ok(client.api_key.some(key => typeof key.current_key === 'string' && key.current_key.length > 0));
});

test('The bundled client configuration contains no service-account credentials', () => {
  function hasPrivateCredentials(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([key, child]) =>
      ['private_key', 'private_key_id', 'client_email'].includes(key)
      || (key === 'type' && child === 'service_account')
      || hasPrivateCredentials(child),
    );
  }
  assert.equal(hasPrivateCredentials(firebase), false);
});
