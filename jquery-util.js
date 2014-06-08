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

$$.fn.onMutation = function (callback, config) {
    return this.each((index, element) => {
        const singleton = this.eq(index);
        new element.ownerDocument.defaultView.MutationObserver(
            function (records, observer) {
                if (callback(singleton, records)) {
                    observer.disconnect();
                }
            }
        ).observe(element, config);
    });
};

$$.fn.onSubtreeMutation = function (callback) {
    return this.onMutation(
        singleton => callback.call(singleton),
        { childList: true, subtree: true }
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
