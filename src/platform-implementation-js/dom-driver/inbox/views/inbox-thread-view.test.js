/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import delay from 'pdelay';
import idMap from '../../../lib/idMap';
import InboxThreadView from './inbox-thread-view';
import ContentPanelViewDriver from '../../../driver-common/sidebar/ContentPanelViewDriver';

function makeDriver(): Object {
  const _openOrOpeningStreamBus = kefirBus();
  const _addedPanels = [];
  const driver: Object = {
    getAppId: () => 'foo',
    getOpts: _.constant({
      appName: 'driver appName',
      appIconUrl: 'http://localhost/driver/appIconUrl.png'
    }),
    getThreadViewElementsMap: _.constant(new Map()),
    getAppSidebarView: _.constant({
      _openOrOpeningStreamBus,
      _addedPanels,
      addSidebarContentPanel(descriptor) {
        if (
          !document.querySelector('.' + idMap('app_sidebar_waiting_platform'))
        ) {
          const waitingPlatform = document.createElement('div');
          waitingPlatform.className = idMap('app_sidebar_waiting_platform');
          ((document.body: any): HTMLElement).appendChild(waitingPlatform);
        }
        const panel = new ContentPanelViewDriver(driver, descriptor, 'foobar');
        _addedPanels.push(panel);
        return panel;
      },
      getOpenOrOpeningStream: _.constant(
        _openOrOpeningStreamBus.toProperty(() => false).onValue(() => {})
      ),
      open: jest.fn()
    })
  };
  return driver;
}

function makeElement(): { el: HTMLElement, parsed: Object } {
  const el = document.createElement('div');
  const parsed: Object = {
    elements: {
      stickyHeading: document.createElement('div')
    }
  };
  return { el, parsed };
}

test('construction works', () => {
  const { el, parsed } = makeElement();
  const threadView = new InboxThreadView(el, makeDriver(), parsed);
});

describe('addSidebarContentPanel', () => {
  test('button is added to thread', () => {
    const driver = makeDriver();
    const { el, parsed } = makeElement();
    const threadView = new InboxThreadView(el, driver, parsed);
    threadView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: 'http://localhost/driver/bar.png',
        el: document.createElement('div')
      })
    );
    const { stickyHeading } = parsed.elements;
    expect(stickyHeading.querySelectorAll('button').length).toBe(1);
    expect(stickyHeading.querySelector('button').title).toBe('driver appName');
    expect(stickyHeading.querySelector('button img').src).toBe(
      'http://localhost/driver/appIconUrl.png'
    );
    expect(
      stickyHeading
        .querySelector('button')
        .parentElement.getAttribute('data-count')
    ).toBe(null);
    const appSidebarView = driver.getAppSidebarView();
    expect(appSidebarView._addedPanels.length).toBe(1);
    const panel = appSidebarView._addedPanels[0];
    panel.remove();
    expect(stickyHeading.querySelectorAll('button').length).toBe(0);
  });

  test('exiting thread removes panel', () => {
    const driver = makeDriver();
    const { el, parsed } = makeElement();
    const threadView = new InboxThreadView(el, driver, parsed);
    threadView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: 'http://localhost/driver/bar.png',
        el: document.createElement('div')
      })
    );
    const appSidebarView = driver.getAppSidebarView();
    expect(appSidebarView._addedPanels.length).toBe(1);
    const panel = appSidebarView._addedPanels[0];
    const onPanelRemove = jest.fn();
    panel.getStopper().onValue(onPanelRemove);
    expect(onPanelRemove).toHaveBeenCalledTimes(0);
    threadView.destroy();
    expect(onPanelRemove).toHaveBeenCalledTimes(1);
  });

  test('multiple app sidebars can be added and removed in reverse order', () => {
    const driver = makeDriver();
    const { el, parsed } = makeElement();
    const threadView = new InboxThreadView(el, driver, parsed);
    threadView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: 'http://localhost/driver/bar.png',
        el: document.createElement('div')
      })
    );
    threadView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo2',
        iconUrl: '/bar2.png',
        el: document.createElement('div')
      })
    );
    const { stickyHeading } = parsed.elements;
    expect(stickyHeading.querySelectorAll('button').length).toBe(1);
    expect(stickyHeading.querySelector('button').title).toBe('driver appName');
    expect(stickyHeading.querySelector('button img').src).toBe(
      'http://localhost/driver/appIconUrl.png'
    );
    expect(
      stickyHeading
        .querySelector('button')
        .parentElement.getAttribute('data-count')
    ).toBe('2');
    const appSidebarView = driver.getAppSidebarView();
    expect(appSidebarView._addedPanels.length).toBe(2);
    const [panel1, panel2] = appSidebarView._addedPanels;
    panel2.remove();
    expect(stickyHeading.querySelectorAll('button').length).toBe(1);
    expect(
      stickyHeading
        .querySelector('button')
        .parentElement.getAttribute('data-count')
    ).toBe(null);
    panel1.remove();
    expect(stickyHeading.querySelectorAll('button').length).toBe(0);
  });

  test('multiple app sidebars can be removed in order', () => {
    const driver = makeDriver();
    const { el, parsed } = makeElement();
    const threadView = new InboxThreadView(el, driver, parsed);
    threadView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo',
        iconUrl: 'http://localhost/driver/bar.png',
        el: document.createElement('div')
      })
    );
    threadView.addSidebarContentPanel(
      Kefir.constant({
        title: 'foo2',
        iconUrl: '/bar2.png',
        el: document.createElement('div')
      })
    );
    const { stickyHeading } = parsed.elements;
    expect(stickyHeading.querySelectorAll('button').length).toBe(1);
    expect(
      stickyHeading
        .querySelector('button')
        .parentElement.getAttribute('data-count')
    ).toBe('2');
    const appSidebarView = driver.getAppSidebarView();
    expect(appSidebarView._addedPanels.length).toBe(2);
    const [panel1, panel2] = appSidebarView._addedPanels;
    panel1.remove();
    expect(stickyHeading.querySelectorAll('button').length).toBe(1);
    expect(
      stickyHeading
        .querySelector('button')
        .parentElement.getAttribute('data-count')
    ).toBe(null);
    panel2.remove();
    expect(stickyHeading.querySelectorAll('button').length).toBe(0);
  });
});
