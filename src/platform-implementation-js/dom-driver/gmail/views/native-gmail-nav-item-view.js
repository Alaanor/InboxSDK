import _ from 'lodash';
import Bacon from 'baconjs';
import baconFlatten from '../../../lib/bacon-flatten';

import getInsertBeforeElement from '../../../lib/dom/get-insert-before-element';
import eventNameFilter from '../../../lib/event-name-filter';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import makeMutationObserverStream from '../../../lib/dom/make-mutation-observer-stream';

import GmailElementGetter from '../gmail-element-getter';

import NavItemViewDriver from '../../../driver-interfaces/nav-item-view-driver';
import GmailNavItemView from './gmail-nav-item-view';

const LEFT_INDENTATION_PADDING = 14;

function NativeGmailNavItemView(nativeElement, navItemName) {
	NavItemViewDriver.call(this);

	this._element = nativeElement;
	this._eventStream = new Bacon.Bus();

	this._navItemName = navItemName;

	this._monitorElementForActiveChanges();
}

NativeGmailNavItemView.prototype = Object.create(NavItemViewDriver.prototype);

_.extend(NativeGmailNavItemView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: false, get: true},
		{name: '_navItemName', destroy: false},
		{name: '_activeMarkerElement', destroy: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_itemContainerElement', destroy: true}
	],

	addNavItem: function(orderGroup, navItemDescriptor){
		var gmailNavItemView = new GmailNavItemView(orderGroup, 1);

		gmailNavItemView
			.getEventStream()
			.filter(eventNameFilter('orderChanged'))
			.onValue(this, '_addNavItemElement', gmailNavItemView);

		gmailNavItemView.setNavItemDescriptor(navItemDescriptor);

		return gmailNavItemView;
	},

	setActive: function(value){
		if(value){
			this._element.classList.add('ain');
			this._element.querySelector('.TO').classList.add('nZ');
			this._element.querySelector('.TO').classList.add('aiq');
		}
		else{
			this._element.classList.remove('ain');
			this._element.querySelector('.TO').classList.remove('nZ');
			this._element.querySelector('.TO').classList.remove('aiq');
		}

		this._setHeights();
	},

	toggleCollapse: function(){
		this._toggleCollapse();
	},

	setCollapsed: function(value){
		localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = value;

		if(!this._element.querySelector('.inboxsdk__expando')){
			return;
		}

		if(value){
			this._collapse();
		}
		else{
			this._expand();
		}
	},

	remove: function(){
		//do nothing
	},

	_monitorElementForActiveChanges: function(){
		this._element.classList.add('inboxsdk__navItem_claimed');
		var element = this._element;
		var classChangeStream = makeMutationObserverChunkedStream(element, {
			attributes: true, attributeFilter: ['class']
		})
			.takeUntil(this._eventStream.filter(false).mapEnd())
			.toProperty(null)
			.map(_.constant(element));

		classChangeStream
			.filter(el =>
				el.classList.contains('ain')
			)
			.onValue(this, '_createActiveMarkerElement');

		classChangeStream
			.filter(el =>
				!el.classList.contains('ain')
			)
			.onValue(this, '_removeActiveMarkerElement');

		this._eventStream.plug(
			baconFlatten(
				makeMutationObserverStream(element.parentElement, {childList: true})
					.map(mutation =>
						_.toArray(mutation.removedNodes)
					)
			)
				.filter(removedNode =>
					removedNode === element
				)
				.map(_.constant({eventName: 'invalidated'}))
		);
	},

	_addNavItemElement: function(gmailNavItemView){
		var itemContainerElement = this._getItemContainerElement();

		var insertBeforeElement = getInsertBeforeElement(gmailNavItemView.getElement(), itemContainerElement.children, ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint']);
		itemContainerElement.insertBefore(gmailNavItemView.getElement(), insertBeforeElement);

		var element = gmailNavItemView.getElement();
		element.querySelector('.TO').style.paddingLeft = LEFT_INDENTATION_PADDING + 'px';

		this._setHeights();
	},

	_getItemContainerElement: function(){
		if(!this._itemContainerElement){
			this._itemContainerElement = this._element.querySelector('.inboxsdk__navItem_container');
			if(!this._itemContainerElement){
				this._createItemContainerElement();
				this._createExpando();
			}
		}

		return this._itemContainerElement;
	},

	_createItemContainerElement: function(){
		this._itemContainerElement = document.createElement('div');
		this._itemContainerElement.classList.add('inboxsdk__navItem_container');

		this._element.appendChild(this._itemContainerElement);
	},

	_createExpando: function(){
		const link = this._element.querySelector('a');

		const expandoElement = document.createElement('div');
		expandoElement.setAttribute('class', 'TH aih J-J5-Ji inboxsdk__expando');
		expandoElement.setAttribute('role', 'link');
		expandoElement.title = `Expand ${link ? link.title || link.textContent : ''}`;

		expandoElement.addEventListener('click', e => {
			this._toggleCollapse();
			e.stopPropagation();
			e.preventDefault();
			e.stopImmediatePropagation();
		}, true);

		this._element.querySelector('.nU').insertAdjacentElement('beforebegin', expandoElement);

		if(localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] === 'collapsed'){
			this._collapse();
		}
		else{
			this._expand();
		}
	},

	_toggleCollapse: function(){
		if(!this._element.querySelector('.inboxsdk__expando')){
			if(localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] === 'collapsed'){
				localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = 'expanded';
			}
			else{
				localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = 'collapsed';
			}
			return;
		}

		if(localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] === 'collapsed'){
			this._expand();
		}
		else{
			this._collapse();
		}
	},

	_collapse: function(){
		var expandoElement = this._element.querySelector('.inboxsdk__expando');
		expandoElement.classList.remove('aih');
		expandoElement.classList.add('aii');

		this._itemContainerElement.style.display = 'none';

		localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = 'collapsed';

		this._eventStream.push({
			eventName: 'collapsed'
		});

		this._setHeights();
	},

	_expand: function(){
		var expandoElement = this._element.querySelector('.inboxsdk__expando');
		expandoElement.classList.add('aih');
		expandoElement.classList.remove('aii');

		this._itemContainerElement.style.display = '';

		localStorage['inboxsdk__nativeNavItem__state_' + this._navItemName] = 'expanded';

		this._eventStream.push({
			eventName: 'expanded'
		});

		this._setHeights();
	},

	_isExpanded: function(){
		return !!this._element.querySelector('.inboxsdk__expando.aih');
	},

	_setHeights: function(){
		var toElement = this._element.querySelector('.TO');

		if(this._element.classList.contains('ain') && this._itemContainerElement){
			this._element.style.height = '';

			var totalHeight = this._element.clientHeight;
			var itemHeight = toElement.clientHeight;

			this._element.style.height = itemHeight + 'px';
			this._element.style.overflow = 'visible';
			this._element.style.marginBottom = (totalHeight - itemHeight) + 'px';
		}
		else{
			this._element.style.height = '';
			this._element.style.overflow = '';
			this._element.style.marginBottom = '';
		}
	},

	_createActiveMarkerElement: function(){
		this._removeActiveMarkerElement();

		this._activeMarkerElement = document.createElement('div');
		this._activeMarkerElement.classList.add('inboxsdk__navItem_marker');
		this._activeMarkerElement.classList.add('ain');
		this._activeMarkerElement.innerHTML = '&nbsp;';

		this._element.insertBefore(this._activeMarkerElement, this._element.firstElementChild);
	},

	_removeActiveMarkerElement: function(){
		if(this._activeMarkerElement){
			this._activeMarkerElement.remove();
			this._activeMarkerElement = null;
		}
	},

	destroy: function(){
		this._element.classList.remove('inboxsdk__navItem_claimed');
		NavItemViewDriver.prototype.destroy.call(this);
	}

});


module.exports = NativeGmailNavItemView;
