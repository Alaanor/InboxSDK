/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import fakeWindowResize from '../../../lib/fake-window-resize';

export default class GmailTopMessageBarDriver {
  _eventStream: Bus<any>;
  _element: ?HTMLElement;

  constructor(optionStream: Kefir.Observable<?Object>) {
    this._eventStream = kefirBus();

    optionStream
      .takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null))
      .onValue(option => {
        if (!option) {
          if (this._element) {
            (this._element: any).remove();
            this._element = null;
          }
        } else if (option) {
          var element = this._element;
          if (!element) {
            element = this._element = document.createElement('div');
            element.classList.add('inboxsdk__topMessageBar');

            ((document.body: any): HTMLElement).insertBefore(
              element,
              ((document.body: any): HTMLElement).firstChild
            );
            fakeWindowResize();
          }

          if (option.el !== element.children[0]) {
            element.innerHTML = '';

            if (option.el) {
              element.appendChild(option.el);
            }
          }
        }
      });
  }

  destroy() {
    if (this._element) {
      (this._element: any).remove();
      this._element = null;
    }
    this._eventStream.end();
    fakeWindowResize();
  }

  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }

  remove() {
    this.destroy();
  }
}
