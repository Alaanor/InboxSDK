/* @flow */

import ErrorCollector from '../../../../lib/ErrorCollector';
import querySelectorOne from '../../../../lib/dom/querySelectorOne';

export default function parser(el: HTMLElement) {
  const ec = new ErrorCollector('thread');

  const inBundle = !el.hasAttribute('aria-multiselectable');

  ec.run('tabindex', () => {
    if (!el.hasAttribute('tabindex')) throw new Error('expected tabindex');
  });

  const inboxThreadId: ?string = ec.run('thread id', () => {
    const m = /thread-[^:]+:[^:\d]*(\d+)/.exec(
      el.getAttribute('data-item-id') || ''
    );
    if (!m) {
      throw new Error('thread id regex failed');
    }
    return m[0];
  });

  const heading = ec.run('heading', () =>
    el.querySelector('div[role=heading]')
  );
  const stickyHeading = !heading
    ? null
    : ec.run('stickyHeading', () => {
        const el = heading.firstElementChild;
        if (el instanceof HTMLDivElement) return el;
        throw new Error('child missing');
      });
  const toolbar = !stickyHeading
    ? null
    : ec.run('toolbar', () => querySelectorOne(stickyHeading, 'ul'));

  // This will be null for threads that are still loading.
  const list = ec.run('list', () => el.querySelector('div[role=list]'));

  const elements = {
    heading,
    stickyHeading,
    toolbar,
    list,
  };
  const score = 1 - ec.errorCount() / ec.runCount();
  return {
    elements,
    attributes: {
      inBundle,
      inboxThreadId,
    },
    score,
    errors: ec.getErrorLogs(),
  };
}

export type Parsed = $ReturnType<typeof parser>;
