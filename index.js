/**
 * This is a very blunt instrument designed to load some JS (encoded in dataURI)
 * before each and every content page load (apps, browser tabs, etc...)
 *
 * Its critical to remember this will _not_ run in the node process.
 *
 * @param {String} dataURI encoded javascript.
 */
function xpcomLoadFrameScript(dataURI) {
  (function() {
    var Cu = Components.utils;
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    Cu.import('resource://gre/modules/Services.jsm');
    Cu.import('resource://gre/modules/XPCOMUtils.jsm');

    XPCOMUtils.defineLazyServiceGetter(this, 'ppmm',
      '@mozilla.org/parentprocessmessagemanager;1', 'nsIMessageBroadcaster');

    var Loader = {
      init: function() {
        Services.obs.addObserver(
          this, 'remote-browser-frame-show', false
        );

        Services.obs.addObserver(
          this, 'in-process-browser-or-app-frame-shown', false
        );
      },

      observe: function(subject, topic, data) {
        var frameLoader = subject.QueryInterface(Ci.nsIFrameLoader);
        var mm = frameLoader.messageManager;

        mm.loadFrameScript(
          dataURI,
          true
        );
      }
    };

    Loader.init();
  }());
}

var fs = require('fs');

/**
 * @param {String} file to encode.
 * @return {String} base64 encoded javascript data:uri.
 */
function loadEncodedJS(file) {
  // sync read just like `require` (it needs to a datauri so gecko will loads it
  // as javascript).
  return 'data:text/javascript;base64,' + fs.readFileSync(file, 'base64');

}

/**
 * Node wrapper around load frame script.
 *
 * @param {Marionette.Client} client to use.
 * @param {String} path of file to load.
 * @param {Function} callback optional callback.
 */
function loadFrameScript(client, path, callback) {
  client.executeScript(xpcomLoadFrameScript, [loadEncodedJS(path)], callback);
}

function plugin(client, options) {
  var chrome = client.scope({ context: 'chrome' });
  return {
    inject: loadFrameScript.bind(this, chrome)
  };
}

module.exports = plugin;
