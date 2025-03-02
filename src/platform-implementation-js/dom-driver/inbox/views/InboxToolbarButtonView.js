/* @flow */

import { defn } from 'ud';
import includes from 'lodash/includes';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import InboxDropdownView from './inbox-dropdown-view';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';

let insertionOrderHint: number = 0;

class InboxToolbarButtonView {
  _stopper = kefirStopper();
  _buttonEl: HTMLElement;

  constructor(
    buttonDescriptor: Object,
    groupOrderHint: string,
    container: HTMLElement
  ) {
    const buttonEl = (this._buttonEl = document.createElement('li'));
    buttonEl.setAttribute('role', 'button');
    buttonEl.setAttribute(
      'data-insertion-order-hint',
      String(insertionOrderHint++)
    );
    buttonEl.setAttribute('data-group-order-hint', groupOrderHint);
    buttonEl.tabIndex = 0;
    buttonEl.className = 'inboxsdk__button_icon';
    const img = document.createElement('img');
    img.className = 'inboxsdk__button_iconImg';
    let onClick = (ignored) => {};
    let hasDropdown = false;
    let dropdown = null;
    Kefir.merge([
      Kefir.fromEvents(buttonEl, 'click'),
      fromEventTargetCapture(buttonEl, 'keyup').filter((e) =>
        includes([32 /*space*/, 13 /*enter*/], e.which)
      ),
    ]).onValue((event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hasDropdown) {
        if (dropdown) {
          dropdown.close();
          return;
        } else {
          this._buttonEl.classList.add('inboxsdk__active');
          dropdown = new DropdownView(new InboxDropdownView(), buttonEl);
          dropdown.setPlacementOptions({
            position: 'bottom',
            hAlign: 'right',
            vAlign: 'top',
            buffer: 10,
          });
          dropdown.on('destroy', () => {
            this._buttonEl.classList.remove('inboxsdk__active');
            dropdown = null;
          });
        }
      }
      onClick({ dropdown });
    });
    let lastOrderHint = null;

    {
      hasDropdown = buttonDescriptor.hasDropdown;
      buttonEl.title = buttonDescriptor.title;
      buttonEl.className =
        'inboxsdk__button_icon ' + (buttonDescriptor.iconClass || '');
      onClick = buttonDescriptor.onClick;
      if (buttonDescriptor.iconUrl) {
        img.src = buttonDescriptor.iconUrl;
        buttonEl.appendChild(img);
      } else {
        img.remove();
      }
      const orderHint = buttonDescriptor.orderHint || 0;
      if (lastOrderHint !== orderHint) {
        lastOrderHint = orderHint;
        buttonEl.setAttribute('data-order-hint', String(orderHint));
        insertElementInOrder(container, buttonEl, undefined, true);
      }
    }

    this._stopper.onValue(() => {
      buttonEl.remove();
      if (dropdown) {
        dropdown.close();
      }
    });
  }

  destroy() {
    this._stopper.destroy();
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }
}

export default defn(module, InboxToolbarButtonView);
