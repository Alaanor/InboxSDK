'use strict';

var Bacon = require('baconjs');

var GmailTooltipView = require('../../widgets/gmail-tooltip-view');

function addTooltipToButton(gmailComposeView, buttonViewController, buttonDescriptor, tooltipDescriptor){

	var gmailTooltipView = new GmailTooltipView(tooltipDescriptor);

	document.body.appendChild(gmailTooltipView.getElement());

	_anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

	gmailComposeView.getEventStream()
					.takeUntil(gmailTooltipView.getEventStream().filter(false).mapEnd())
					.filter(function(event){
						return event.eventName === 'buttonAdded' || event.eventName === 'composeFullscreenStateChanged';
					})
					.debounce(10)
					.onValue(_anchorTooltip, gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor);

	var stoppedIntervalStream = Bacon.interval(50).takeUntil(gmailTooltipView.getEventStream().filter(false).mapEnd());

	var left = 0;
	var top = 0;

	stoppedIntervalStream
			.takeWhile(function(){
				return !!buttonViewController.getView() && !!gmailTooltipView.getElement();
			})
			.map(function(){
				return buttonViewController.getView().getElement().getBoundingClientRect();
			})
			.filter(function(rect){
				return rect.left !== left || rect.top !== top;
			})
			.doAction(function(rect){
				left = rect.left;
				top = rect.top;
			})
			.onValue(gmailTooltipView, 'anchor', buttonViewController.getView().getElement(), 'top');


	stoppedIntervalStream
		.filter(function(){
			return !buttonViewController.getView() || !buttonViewController.getView().getElement().offsetParent;
		})
		.onValue(gmailTooltipView, 'destroy');


	return gmailTooltipView;
}

function _anchorTooltip(gmailTooltipView, gmailComposeView, buttonViewController, buttonDescriptor){
	try{
		gmailComposeView.ensureGroupingIsOpen(buttonDescriptor.type);
		setTimeout(function(){
			gmailTooltipView.anchor(buttonViewController.getView().getElement(), 'top');
		}, 10);
	}
	catch(err){
		console.error(err);
	}
}


module.exports = addTooltipToButton;
