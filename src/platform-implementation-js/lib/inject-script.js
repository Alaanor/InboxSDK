/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

const fs = require('fs');

// Returns a promise that resolves once the injected script has been injected
// and has done its initial load stuff.
const injectScript: () => Promise<null> = once(function() {
  if (!(document.head: any).hasAttribute('data-inboxsdk-script-injected')) {
    const url = 'https://www.inboxsdk.com/build/injected.js';

    const script = document.createElement('script');
    script.type = 'text/javascript';

    const originalCode = fs.readFileSync(
      __dirname + '/../../../dist/injected.js',
      'utf8'
    );
    let disableSourceMappingURL = true;
    try {
      disableSourceMappingURL =
        localStorage.getItem('inboxsdk__enable_sourcemap') !== 'true';
    } catch (err) {
      console.error(err); //eslint-disable-line no-console
    }

    let codeParts = [];
    if (disableSourceMappingURL) {
      // Don't remove a data: URI sourcemap (used in dev)
      codeParts.push(
        originalCode.replace(/\/\/# sourceMappingURL=(?!data:)[^\n]*\n?$/, '')
      );
    } else {
      codeParts.push(originalCode);
    }
    codeParts.push('\n//# sourceURL=' + url + '\n');

    const codeToRun = codeParts.join('');
    script.text = codeToRun;

    (document.head: any).appendChild(script).parentNode.removeChild(script);
    (document.head: any).setAttribute('data-inboxsdk-script-injected', 'true');
  }

  return Kefir.later(0, null)
    .merge(
      makeMutationObserverChunkedStream((document.head: any), {
        attributes: true
      })
    )
    .filter(() =>
      (document.head: any).hasAttribute('data-inboxsdk-user-email-address')
    )
    .take(1)
    .map(() => null)
    .toPromise();
});

if ((module: any).hot) {
  (module: any).hot.accept();
}

export default injectScript;
