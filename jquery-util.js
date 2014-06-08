$$.static.script = function (attrs) {
    return this(this.document.createElement("script")).attr(
        this.extend({ type: "text/javascript" }, attrs || { })
    );
};

$$.static.repeat = function (maxtimes, delay, callback) {
    function test(x) {
        return x && !(
            typeof(x) == "object" && "length" in x && x.length == 0
        );
    }
    let count = 0;
    const id = this.window.setInterval(() => {
        if (++count > maxtimes || test(callback.call(this)))
            this.window.clearInterval(id);
    }, delay);
};

$$.fn.clickthis = function () {
    return this.each(function () { this.click() });
};

$$.fn.enterIframe = function () {
    return this.length > 0 ? Some($$(this[0].contentWindow)) : None();
};

$$.fn.onMutation = function (callback, config, timeout) {
    return this.each((index, element) => {
        const singleton = this.eq(index);
        const window = element.ownerDocument.defaultView;
        const observer = new window.MutationObserver(
            function (records) {
                if (callback(singleton, records)) {
                    observer.disconnect();
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

$$.fn.onSubtreeMutation = function (callback, timeout) {
    return this.onMutation(
        singleton => callback.call(singleton),
        { childList: true, subtree: true },
        timeout
    );
};

$$.fn.onAttrChange = function (callback /* , attr, ... */) {
    const config = { attributes: true };

    if (arguments.length >= 2)
        config.attributeFilter = Array.prototype.slice.call(arguments, 1);

    return this.onMutation(
        function (singleton, records) {
            let done = false;
            for (let { attributeName: name } of records)
                if (callback.call(singleton))
                    done = true;
            return done;
        },
        config
    );

};

$$.static.whenFound = function (selector, callback, timeout) {
    return this(this.document.documentElement)
        .whenFound(selector, callback, timeout);
};

$$.fn.whenFound = function (selector, callback, timeout) {
    const elems = this.constructor(selector);

    if (elems.length > 0) {
        callback(elems);
        return this;
    }

    return this.onSubtreeMutation(
        function () {
            const elems = this.constructor(selector);
            if (elems.length > 0)
                callback(elems);
            return elems.length > 0;
        },
        timeout
    );
};
