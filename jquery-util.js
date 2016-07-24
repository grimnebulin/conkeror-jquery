"use strict";

// Copyright 2016 Sean McAfee

// This file is part of conkeror-jquery.

// conkeror-jquery is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// conkeror-jquery is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with conkeror-jquery.  If not, see
// <http://www.gnu.org/licenses/>.

register_site_variables("jquery", function (buffer) {
    return { $: $$(buffer) };
});

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
        callback.call(elems, elems);
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

//  Because XPath does not have a convenient way to test for the
//  inclusion of specific names in a whitespace-delimited list of them
//  (such as HTML elements' "class" attributes), this interface offers
//  such a convenience.  Both the static and nonstatic versions of the
//  xpath() method (see below) accept an XPath expression that may
//  contain both "%%" and "%s" formatting sequences, followed by a
//  list of strings containing whitespace-delimited names, to a number
//  which should equal the number of "%s" sequences.  The "%s"
//  sequences will be replaced with boolean XPath expressions which
//  evaluate to true if a "class" child attribute node of the current
//  node at the point where the sequence is expanded contains the next
//  name, in order.
//
//  Example:
//
//  $.xpath("//div[%s]//table[%s and %s]", "foo", "bar", "baz")
//  searches for table descendents with the classes "bar" and "baz" of
//  any div elements with class "foo".  This can be equivalently
//  represented as $.xpath("//div[%s]//table[%s and %s]", "foo bar baz").
//
//  "%" characters in the XPath expression which are not followed by
//  another "%" character or an "s" character need not be escaped.

//  Helper function; generator for the nodes found by document.evaluate().

function evalXpath(document, context, xpath) {
    const result = document.evaluate(xpath, context, null, 5, null);
    let node;
    while ((node = result.iterateNext()) !== null)
        yield node;
}

//  This function formats an XPath expression from the arguments
//  object ARGS which was passed to either of the jQuery xpath()
//  methods defined below.  The second and succeeding items in ARGS,
//  if any, are interpreted as strings containing whitespace-delimited
//  class names.  The first item in ARGS is interpreted as an XPath
//  expression with possible embedded formatting sequences "%%" and
//  "%s".  "%%" sequences are collapsed into a single "%" character;
//  "%s" sequences are replaced by boolean XPath expressions that
//  return true if the local "class" attribute contains the class
//  named by the next class from ARGS, in order.
//
//  An exception is raised if the number of supplied classes does not
//  match the number of embedded "%s" sequences.

function formatXpath(args) {
    const classes = xpathParseClasses(Array.slice(args, 1));

    const xpath = args[0].replace(/%([%s])/g, function (_, c) {
        if (c == "%")
            return c;
        if (classes.length == 0)
            throw "Too few classes supplied to XPath expression";
        return 'contains(concat(" ",normalize-space(@class)," "),' +
            xpathString(" " + classes.shift() + " ") + ')';
    });

    if (classes.length > 0)
        throw "Too many classes supplied to XPath expression";

    return xpath;

}

//  This function returns a string containing an XPath expression
//  which evaluates to a string equal to the input parameter STR.  If
//  STR contains no quotation marks, a string literal delimited by
//  quotation marks is returned; otherwise, if it contains no
//  apostrophes, a string literal delimited by apostrophes is
//  returned; otherwise an expression consisting of a call to the
//  XPath function concat(), with string literal arguments delimited
//  by quotation marks and apostrophes as needed, is returned.

function xpathString(str) {
    if (str.indexOf('"') < 0)
        return '"' + str + '"';
    else if (str.indexOf("'") < 0)
        return "'" + str + "'";
    else
        return "concat(" +
            str.split (/("+)/)
               .filter(x => x.length > 0)
               .map   (x => x[0] == '"' ? "'" + x + "'" : '"' + x + '"')
               .join  (",")
            + ")";
}

//  This function returns an array of all consecutive sequences of
//  non-whitespace characters in all of the strings in the input array
//  CLASSES.  "Whitespace" here is meant in the XML sense of the
//  characters with ordinal values 0x20, 0x09, 0x0d, and 0x0a.

function xpathParseClasses(classes) {
    return Array.prototype.concat.apply(
        [ ], classes.map   (c => c.match(/[^\x20\x09\x0d\x0a]+/g))
                    .filter(x => x !== null)
    );
}

//  This method searches for nodes using each of the nodes in this
//  jQuery object in turn as the context node, then collects all of
//  the found nodes together into a new jQuery object.

$$.fn.xpath = function (/* xpath, class, ... */) {
    const xpath = formatXpath(arguments);
    return this.map(function () {
        return [
            node for (node in evalXpath(this.ownerDocument, this, xpath))
        ];
    });
};

//  A static version of the xpath method that searches for nodes using
//  the document's root <html> element as the context node.

$$.static.xpath = function (/* xpath, class, ... */) {
    return this([
        node for (node in evalXpath(
            this.document,
            this.document.documentElement,
            formatXpath(arguments)
        ))
    ]);
};


//  This method returns an object describing the computed style of the
//  first element in this jQuery object.

$$.fn.computedStyle = function () {
    if (this.length == 0) return undefined;
    const style = this.constructor.window.getComputedStyle(this[0]);
    const data  = { };
    for (let i = 0; i < style.length; ++i) {
        const name  = style[i];
        const cased = name.replace(/-([a-z])/g, x => x[1].toUpperCase());
        data[cased] = style.getPropertyValue(name);
    }
    return data;
};
