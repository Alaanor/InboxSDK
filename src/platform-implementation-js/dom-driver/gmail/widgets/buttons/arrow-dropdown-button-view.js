/* @flow */

import GenericButtonView from '../../../../lib/dom/generic-button-view';

export default class ArrowDropdownButtonView extends GenericButtonView {
  constructor(buttonOptions: Object) {
    const element = document.createElement('img');
    element.setAttribute('class', 'afM');
    element.setAttribute(
      'src',
      '//ssl.gstatic.com/ui/v1/icons/mail/images/cleardot.gif'
    );

    element.addEventListener('mouseenter', function() {
      element.classList.add('afN');
    });

    element.addEventListener('mouseleave', function() {
      element.classList.remove('afN');
    });

    super(element);
  }

  activate() {
    this.getElement().classList.add('afO');
  }

  deactivate() {
    this.getElement().classList.remove('afO');
  }
}
