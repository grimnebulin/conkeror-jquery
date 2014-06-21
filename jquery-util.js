//  At some point, creating script elements via $("<script/>") stopped
//  working; script elements created via assignment to innerHTML are
//  executed, per sufficiently recent versions of the HTML DOM.  This
//  static method creates a new script element in the right way.
//
//  Examples:
//
//  let s1 = $.script({ src: scriptURL });
//  let s2 = $.script().text("... javascript code ...");

$$.static.script = function (attrs) {
    return this(this.document.createElement("script")).attr(
        this.extend({ type: "text/javascript" }, attrs || { })
    );
};

//  This static method executes a callback function repeatedly until
//  it returns a truthy value.  The callback will be executed every
//  DELAY milliseconds, a maximum of MAXTIMES times.  Its "this"
//  argument will be the same jQuery constructor function on which the
//  repeat method was called; no other arguments are passed.
//
//  As a special convenience, the value returned by the callback
//  function will be treated as if it were a false value if it is an
//  object with a "length" attribute, and the value of that attribute
//  is zero.  For example, an empty jQuery object will be treated as
//  false.
//
//  This method had historically been useful for repeatedly checking
//  for the presence of elements of interest that may be inserted
//  later by Javascript code.  Nowadays, the onSubtreeMutation method
//  below provides a more elegant approach to this situation.

$$.static.repeat = function (maxtimes, delay, callback) {
    function test(x) {
        return x && !(
            typeof(x) == "object" && "length" in x && x.length === 0
        );
    }
    let count = 0;
    const id = this.window.setInterval(() => {
        if (++count > maxtimes || test(callback.call(this)))
            this.window.clearInterval(id);
    }, delay);
};

//  The clickthis method simply calls the native DOM click() method on
//  each of the nodes wrapped by this jQuery object.

$$.fn.clickthis = function () {
    return this.each(function () { this.click() });
};

//  This method returns a new jQuery object that refers to the
//  document embedded in the first element of this jQuery object, if
//  it is an <iframe> element.  Rather, it returns a Maybe object (see
//  conkutil.js) that is a None if the invocant is empty or if its
//  first element is not an iframe element, and a Some otherwise.
//
//  For example, changing the style of the first iframe object's
//  <body> element to blue, if such an iframe element exists:
//
//  $("iframe").enterIFrame().foreach(
//    $ => $("body").css("background", "blue")
//  );

$$.fn.enterIframe = function () {
    return this.length > 0 && this[0].tagName == "IFRAME"
        ? Some($$(this[0].contentWindow))
        : None();
};

//  onMutation is a private-ish function that helps implement the
//  other mutation-related method farther down.  It provides a
//  somewhat higher-level interface to a MutationObserver object.
//
//  For each node in the invocant jQuery object, the CALLBACK function
//  will be invoked whenever the type of mutation specified in CONFIG
//  occurs.  If the callback returns a true value, the specified
//  mutations are no longer watched for.  If TIMEOUT is present and
//  true, mutations will no longer be watched for after that many
//  milliseconds.
//
//  CALLBACK will be called with two arguments: a jQuery object
//  wrapping the single element on which the mutation was observed,
//  and the "records" that were passed to the MutationObserver
//  callback.
//
//  CONFIG is passed directly as the second argument to the
//  MutationObserver's observe() method.

$$.fn.onMutation = function (callback, config, timeout) {
    return this.each((index, element) => {
        const singleton = this.eq(index);
        const window = element.ownerDocument.defaultView;
        const observer = new window.MutationObserver(
            function (records, self) {
                if (callback(singleton, records)) {
                    self.disconnect();
                }
            }
        );

        observer.observe(element, config);

        if (timeout) {
            window.setTimeout(
                function () { observer.disconnect() },
                timeout
            );
        }

    });
};

//  This static method watches for node additions and deletions
//  anywhere in the entire document.

$$.static.onDocumentMutation = function (callback, timeout) {
    return this(this.document.documentElement)
        .onSubtreeMutation(callback, timeout);
};

//  This method watches for node additions and deletions anywhere
//  under any of the nodes wrapped by this jQuery object.

$$.fn.onSubtreeMutation = function (callback, timeout) {
    return this.onMutation(
        singleton => callback.call(singleton),
        { childList: true, subtree: true },
        timeout
    );
};

//  This method watches for changes to attributes on any of the
//  elements wrapped by this jQuery object.  If any arguments are
//  specifed after the CALLBACK parameter, they are taken to be the
//  names of attributes to watch; otherwise all attributes are
//  watched.  The callback is passed the name of the attribute that
//  changed as its first and only parameter.

$$.fn.onAttrChange = function (callback /* , attr, ... */) {
    const config = { attributes: true };

    if (arguments.length >= 2)
        config.attributeFilter = Array.prototype.slice.call(arguments, 1);

    return this.onMutation(
        function (singleton, records) {
            let done = false;
            for (let { attributeName: name } of records)
                if (callback.call(singleton, name))
                    done = true;
            return done;
        },
        config
    );

};

//  This method calls CALLBACK when any elements matching SELECTOR are
//  found in the document.  If any such elements are present when this
//  method is called, the callback is simply called immediately.
//  Otherwise, the callback is called later, once, whenever matching
//  elements appear.  If TIMEOUT is present, it designates the maximum
//  number of milliseconds matching elements will be looked for.
//
//  The callback will be called with both its "this" parameter and its
//  first formal parameter set to the jQuery object containing the
//  matched elements.

$$.fn.whenFound = function (selector, callback, timeout) {
    const elems = this.constructor(selector);

    if (elems.length > 0) {
        callback(elems);
        return this;
    }

    return this.onSubtreeMutation(
        function () {
            const elems = this.constructor(selector);
            const done = elems.length > 0;
            if (done) callback.call(elems, elems);
            return done;
        },
        timeout
    );

};

//  A static version of the whenFound method that just dispatches to a
//  jQuery object wrapping the document's root element.

$$.static.whenFound = function (selector, callback, timeout) {
    return this(this.document.documentElement)
        .whenFound(selector, callback, timeout);
};

//  A convenience function for removing elements.

function remove_it(arg) {
    arg.remove();
}

//
//  XPath interface.
//

// Helper function; generator for the nodes found by document.evaluate().

function evalXpath(document, context, xpath) {
    const result = document.evaluate(xpath, context, null, 5, null);
    let node;
    while ((node = result.iterateNext()) !== null)
        yield node;
}

//  This method searches for nodes using each of the nodes in this
//  jQuery object in turn as the context node, then collects all of
//  the found nodes together into a new jQuery object.

$$.fn.xpath = function (xpath) {
    return this.map(function () {
        return [
            node for (node in evalXpath(this.ownerDocument, this, xpath))
        ];
    });
};


//  A static version of the xpath method that searches for nodes using
//  the document's root <html> element as the context node.

$$.static.xpath = function (xpath) {
    return this([
        node for (node in evalXpath(
            this.document, this.document.documentElement, xpath
        ))
    ]);
};
