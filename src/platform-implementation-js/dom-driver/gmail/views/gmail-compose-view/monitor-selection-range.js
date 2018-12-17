/* @flow */

var Kefir = require('kefir');
import type GmailComposeView from '../gmail-compose-view';

export default function(gmailComposeView: GmailComposeView) {
  Kefir.merge([
    Kefir.fromEvents((document.body: any), 'mousedown'),
    Kefir.fromEvents((document.body: any), 'keydown')
  ])
    .takeUntilBy(gmailComposeView.getStopper())
    .onValue(event => {
      var body = gmailComposeView.getMaybeBodyElement();
      var selection = (document: any).getSelection();
      if (
        body &&
        selection.rangeCount > 0 &&
        body.contains(selection.anchorNode)
      ) {
        gmailComposeView.setLastSelectionRange(selection.getRangeAt(0));
      }
    });
}
