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
