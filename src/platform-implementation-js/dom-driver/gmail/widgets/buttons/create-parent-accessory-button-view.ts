import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import { ButtonViewI } from '../../../../widgets/buttons/basic-button-view-controller';

export default class CreateParentAccessoryButtonView implements ButtonViewI {
  private _element: HTMLElement = document.createElement('div');
  private _eventStream = kefirBus<any, any>();
  private _stopper = kefirStopper();

  public constructor() {
    this._setupElement();
    this._setupEventStream();
  }

  public activate() {
    const innerButtonElement = this._element.firstElementChild;
    if (innerButtonElement) {
      innerButtonElement.classList.add('aj1');
    }
  }

  public deactivate() {
    const innerButtonElement = this._element.firstElementChild;
    if (innerButtonElement) {
      innerButtonElement.classList.remove('aj1');
    }
  }

  public destroy() {
    this._element.remove();
    this._eventStream.end();
    this._stopper.destroy();
  }

  public getElement(): HTMLElement {
    return this._element;
  }

  public getEventStream(): Kefir.Observable<any, any> {
    return this._eventStream;
  }

  public setEnabled() {
    throw new Error('not implemented');
  }

  public update() {
    // noop
  }

  private _setupElement() {
    this._element.setAttribute(
      'class',
      'Yh inboxsdk__navItem_parent_accessory_button'
    );
    this._element.setAttribute('role', 'button');
    this._element.setAttribute('tabindex', '0');
    this._element.setAttribute('type', 'button');
  }

  private _setupEventStream() {
    const clickEventStream = Kefir.fromEvents<any, never>(
      this._element,
      'click'
    );

    clickEventStream.onValue((event) => {
      event.stopPropagation();
      event.preventDefault();
    });

    this._eventStream.plug(
      clickEventStream.map((event) => ({ eventName: 'click', domEvent: event }))
    );
  }
}
