/* @flow */

import Kefir from 'kefir';
import kefirCast from 'kefir-cast';

import ContentPanelView from '../views/content-panel-view';
import get from '../../common/get-or-fail';

import type { PiOpts } from '../platform-implementation';
import type Membrane from '../lib/Membrane';
import type { Driver } from '../driver-interfaces/driver';

const memberMap = new WeakMap();

export default class Global {
  constructor(appId: string, driver: Driver, piOpts: PiOpts) {
    const members = { appId, driver, piOpts };
    memberMap.set(this, members);
  }

  async addSidebarContentPanel(descriptor: Object): Promise<?ContentPanelView> {
    const descriptorPropertyStream = kefirCast(
      (Kefir: any),
      descriptor
    ).toProperty();
    const members = get(memberMap, this);

    members.driver.getLogger().eventSdkPassive('global.addSidebarContentPanel');

    const contentPanelImplementation = await members.driver.addGlobalSidebarContentPanel(
      descriptorPropertyStream
    );
    if (contentPanelImplementation) {
      return new ContentPanelView(contentPanelImplementation);
    }

    return null;
  }

  async addSupportItem(supportItemDescriptor: Object) {
    const members = get(memberMap, this);
    members.driver.getLogger().eventSdkPassive('global.addSupportItem');

    members.driver.addSupportItem(supportItemDescriptor.element);
  }
}
