# SUMMARY

`conkeror-jquery` is a package that provides a
[jQuery](http://jquery.com/) interface to
[Conkeror](http://conkeror.org/).

# INSTALLATION

A patch to a stock version of jQuery is provided.  It must be applied
to an uncompressed copy of jQuery, downloaded separately.  For example:

    $ patch -p1 < jquery-1.6.2-for-conkeror.patch

# API

## Constructor

The `$$` function accepts a Conkeror buffer, window, or interactive
context object, and returns a jQuery object that refers to the HTML
content of its argument.

Example:

    interactive("nofixed", "Remove fixed elements", function (I) {
      const $ = $$(I);
      $("*").filter(function () {
        return $.window.getComputedStyle(this).display === "fixed";
      }).remove();
    });

The returned jQuery object has the extra properties "window" and
"document" set to the window and document objects of its content.  In
typical browser-based jQuery usage, these names would be accessible
via the global object, but no such appropriate global object is
available in Conkeror.

Two more useful fields are available on the `$$` constructor function:

- `fn`

  An object mapping names to functions.  Whenever a new jQuery object
  is created by the constructor, its `fn` prototype field is updated
  with the members of the constructor's `fn` object.  In essence,
  then, the `fn` field defines new instance methods that will be added
  to all jQuery objects created by the constructor.
  
- `static`

  Another object mapping names to functions.  Mappings in this object
  will be copied directly to newly created jQuery objects before they
  are returned.
  
Example:

    $$.static.hello = function (who) { return "Hello " + who + "!" };
    $$.fn.wipeout = function (str) { return this.text(str) };
    const $ = $$(buffer);
    $("body").wipeout($.hello("World"));

## Extra functionality

A number of useful jQuery functions are provided by the
`jquery-util.js` file.  These essentially amount to built-in plugins.

### Mutation

These routines wrap the browser's
[MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
interface.

- $(...).onSubtreeMutation(callback, timeout)

  Register a function that will be called whenever any of the elements
  in the jQuery object's matched set changes, or when any of those
  elements' descendents change.  The callback will be called with no
  arguments, and with `this` set to a singleton jQuery object
  containing just the element whose subtree changed.
  
  If the callback function ever returns a truthy value, the callback
  will be unregistered from the element that triggered the call.
  
  If `timeout` is present and truthy, it designates a number of
  milliseconds after which the callback will be unregistered from all
  elements.
  
  Example:

      // Whenever the element with ID "main" changes, remove any
      // descendent elements with the class "ad":
      $("#main").onSubtreeMutation(function () {
        this.find(".ad").remove();
      });

- $.onDocumentMutation(callback, timeout)

  This is a static version of `onSubtreeMutation` that implicitly
  operates on the document's root element.
  
- $(...).onAttrChange(callback, attr1, attr2, ...)

  Register a callback that will be called whenever any of the
  specified attributes changes on any of the jQuery object's matched
  set--that is, whenever any of those attributes is added to, removed
  from, or changes on any of those elements.  If no attributes are
  specified, the callback will be called whenever *any* attribute
  changes on the matched elements.
  
  The callback will be called with a single argument, the name of the
  attribute that changed.  The `this` parameter will be a singleton
  jQuery object that contains just the element whose attribute has
  changed.
  
  If multiple attributes change at once, the callback will be called
  once for each of them.  If the callback returns a truthy value for
  any attribute, the callback will be unregistered.
  
- $(...).whenFound(selector, callback, timeout)

  Register a callback that will be called when the given jQuery
  selector identifies a nonempty collection of elements.
  
  If such elements are found at the time `whenFound` is called, the
  callback is called immediately, with both the first argument and
  `this` set to a jQuery object containing whatever elements
  `selector` matched, and nothing further is done.  Otherwise, an
  internal callback is registered with `$.onSubtreeMutation`
  (described above) that watches for modifications to the element
  subtrees rooted at any of the elements in the jQuery object's
  matched set.  Whenever any modification to any subtree occurs,
  the document is searched with `selector` and, if the matched set is
  nonempty, the callback is called as described above and is then
  unregistered.
  
  If `timeout` is present and truthy, it designates a number of
  milliseconds after which the callback will be unregistered.
  
  Note that the entire document is searched with `selector`, not just
  elements under the matched set.
  
- $.whenFound(selector, callback, timeout)

  This is a static version of `whenFound` that implicitly operates on
  the document's root element.
  
  Example:
  
      // Remove the element with ID "right-pane" as soon as it appears:
      $.whenFound("#right-pane").remove();

### XPath

These routines wrap the XPath interface provided by the browser's
[document.evaluate](https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate) function.

- $(...).xpath(xpath, class1, class2, ...)

  This method is similar to jQuery's `find` instance method, but the
  selector is interpreted as XPath.  Each of the elements in the
  jQuery object's matched set is taken in sequence as an XPath context
  node, the given XPath search is made on each of them, and all
  matched elements are accumulated into a single jQuery object, which
  is returned.
  
  Writing XPath expressions that correspond to jQuery class selectors
  can be irksome, so class names can be provided as additional
  arguments.  `"%s"` substrings of the `xpath` parameter will be
  replaced, in order, with XPath boolean expressions that evaluates to
  true if the context element at that point has a `class` attribute
  that contains that class.  Literal `"%"` characters must be doubled
  to be interpreted literally.
  
  If there is a mismatch between the number of `%s`es and classes, an
  exception is thrown.
  
  Each `class` argument may itself contain multiple classes, separated
  by whitespace.  For example, `jq.xpath(x, "foo bar")` is equivalent
  to `jq.xpath(x, "foo", "bar")`.

- $.xpath(xpath, class1, class2, ...)

  This is a static version of `xpath` that uses the document's root
  element as the single XPath context node.
  
Example:

    // Remove every div whose parent is a div with the class "foo":
    $.xpath("//div[parent::div[%s]]", "foo").remove();

### Miscellaneous

- $(...).computedStyle()

  Returns an object that describes all style attributes of the first
  element in the jQuery object's matched set.  (If the jQuery object
  is empty, undefined is returned instead.)
  
  This method wraps the getComputedStyle function of the jQuery
  object's window.  For convenience, attribute names are camel-cased
  before being returned.
  
  Example:
  
      const bottom = $("body").computedStyle().marginBottom;

- $.script(attrs)

  Create a <script> element with the given attributes, if any.  If no
  "type" attribute is explicitly provided, the type "text/javascript"
  is used.
  
  Example:
  
      $.script().text("alert('Hello world!')").appendTo("head");
      $.script({ src: "localhost:8000/script.js"}).appendTo("head");
    
- $.repeat(maxtimes, delay, callback)

  Call the provided callback function up to maxtimes times, with delay
  microseconds between each call, until it returns a truthy value OR
  an object with a zero length attribute (such as an empty jQuery
  object).  The callback's "this" will be the same jQuery constructor
  object on which repeat was called.
  
  This function was historically used to repeatedly check for the
  presence of elements dynamically added after page load, but the
  document mutation interface described above is better for this.
  
- $(...).clickthis()

  Calls the native DOM click() method on each element in the jQuery
  object's matched set.

- remove_it(arg)

  Calls the remove method of arg with no arguments and returns
  nothing.
  
  This is a global function that is a convenient callback for
  whenFound, above.
