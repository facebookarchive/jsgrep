exports.createCustomError = (function() {

    function define(obj, prop, value) {
        Object.defineProperty(obj, prop, {
            value: value,
            configurable: true,
            enumerable: false,
            writable: true
        });
    }

    return function(name, init, proto) {
        var CustomError;
        proto = proto || {};
        function build(message) {
            var self = this instanceof CustomError
                ? this
                : Object.create(CustomError.prototype);
            Error.apply(self, arguments);
            Error.captureStackTrace(self, CustomError);
            if (message != undefined) {
                define(self, 'message', String(message));
            }
            define(self, 'arguments', undefined);
            define(self, 'type', undefined);
            if (typeof init == 'function') {
                init.apply(self, arguments);
            }
            return self;
        }
        eval('CustomError = function ' + name + '() {' +
            'return build.apply(this, arguments); }');
        CustomError.prototype = Object.create(Error.prototype);
        define(CustomError.prototype, 'constructor', CustomError);
        for (var key in proto) {
            define(CustomError.prototype, key, proto[key]);
        }
        Object.defineProperty(CustomError.prototype, 'name', { value: name });
        return CustomError;
    }

})();
