var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

/**
 * @class
 * Object that represents a specific route view instance
 */
var RouteView = function(routeViewImplementation, route){
	EventEmitter.call(this);

	this._routeViewImplementation = routeViewImplementation;
	this._route = route;

	this._bindToEventStream();
};

RouteView.prototype = Object.create(EventEmitter.prototype);

_.extend(RouteView.prototype, /** @lends RouteView */{
	/**
	 * Get the name of the RouteView
	 * @return {string}
	 */
	getName: function(){
		return this._routeViewImplementation.getName();
	},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {stringp[]}
	 */
	getParams: function(){
		return this._routeViewImplementation.getParams();
	},

	/**
	 * Indicates whether this RouteView is a custom route, or native to the web client
	 * @return {Boolean}
	 */
	isCustomRoute: function(){
		return this._routeViewImplementation.isCustomView();
	},

	getElement: function(){
		return this._routeViewImplementation.getCustomViewElement();
	},

	/* deprecated */
	isCustomView: function(){
		return this.isCustomRoute();
	},

	/* deprecated */
	getDescriptor: function(){
		return this._route;
	},

	_bindToEventStream: function(){
		this._routeViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}

	/**
	 * Fires an "unload" event when this RouteView instance is no longer needed
	 */

});

module.exports = RouteView;
