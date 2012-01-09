/**
 * This is the stock JSON2 implementation from www.json.org.
 *
 * Modifications include:
 * 1/ Removal of jslint settings
 *
 * @provides fb.thirdparty.json2
 */

/*
    http://www.JSON.org/json2.js
    2009-09-29

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html

    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
    this.JSON = {};
}

(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                   this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.prelude
 */

/**
 * Prelude.
 *
 *     Namespaces are one honking great idea -- let's do more of those!
 *                                                            -- Tim Peters
 *
 * The Prelude is what keeps us from being messy. In order to co-exist with
 * arbitary environments, we need to control our footprint. The one and only
 * rule to follow here is that we need to limit the globals we introduce. The
 * only global we should every have is ``FB``. This is exactly what the prelude
 * enables us to do.
 *
 * The main method to take away from this file is `FB.copy()`_. As the name
 * suggests it copies things. Its powerful -- but to get started you only need
 * to know that this is what you use when you are augmenting the FB object. For
 * example, this is skeleton for how ``FB.Event`` is defined::
 *
 *   FB.provide('Event', {
 *     subscribe: function() { ... },
 *     unsubscribe: function() { ... },
 *     fire: function() { ... }
 *   });
 *
 * This is similar to saying::
 *
 *   FB.Event = {
 *     subscribe: function() { ... },
 *     unsubscribe: function() { ... },
 *     fire: function() { ... }
 *   };
 *
 * Except it does some housekeeping, prevents redefinition by default and other
 * goodness.
 *
 * .. _FB.copy(): #method_FB.copy
 *
 * @class FB
 * @static
 * @access private
 */
if (!window.FB) {
  FB = {
    // use the init method to set these values correctly
    _apiKey     : null,
    _session    : null,
    _userStatus : 'unknown', // or 'notConnected' or 'connected'

    // logging is enabled by default. this is the logging shown to the
    // developer and not at all noisy.
    _logging: true,
    _inCanvas: (
      (window.location.search.indexOf('fb_sig_in_iframe=1') > -1) ||
      (window.location.search.indexOf('session=') > -1)),


    //
    // DYNAMIC DATA
    //
    // the various domains needed for using Connect
    _domain: {
      api      : 'https://api.facebook.com/',
      api_read : 'https://api-read.facebook.com/',
      cdn      : (window.location.protocol == 'https:'
                   ? 'https://s-static.ak.fbcdn.net/'
                   : 'http://static.ak.fbcdn.net/'),
      graph    : 'https://graph.facebook.com/',
      staticfb : 'http://static.ak.facebook.com/',
      www      : window.location.protocol + '//www.facebook.com/'
    },
    _locale: null,
    _localeIsRtl: false,


    /**
     * Copies things from source into target.
     *
     * @access private
     * @param target    {Object}  the target object where things will be copied
     *                            into
     * @param source    {Object}  the source object where things will be copied
     *                            from
     * @param overwrite {Boolean} indicate if existing items should be
     *                            overwritten
     * @param tranform  {function} [Optional], transformation function for
     *        each item
     */
    copy: function(target, source, overwrite, transform) {
      for (var key in source) {
        if (overwrite || typeof target[key] === 'undefined') {
          target[key] = transform ? transform(source[key]) :  source[key];
        }
      }
      return target;
    },

    /**
     * Create a namespaced object.
     *
     * @access private
     * @param name {String} full qualified name ('Util.foo', etc.)
     * @param value {Object} value to set. Default value is {}. [Optional]
     * @return {Object} The created object
     */
    create: function(name, value) {
      var node = window.FB, // We will use 'FB' as root namespace
      nameParts = name ? name.split('.') : [],
      c = nameParts.length;
      for (var i = 0; i < c; i++) {
        var part = nameParts[i];
        var nso = node[part];
        if (!nso) {
          nso = (value && i + 1 == c) ? value : {};
          node[part] = nso;
        }
        node = nso;
      }
      return node;
    },

    /**
     * Copy stuff from one object to the specified namespace that
     * is FB.<target>.
     * If the namespace target doesn't exist, it will be created automatically.
     *
     * @access private
     * @param target    {Object|String}  the target object to copy into
     * @param source    {Object}         the source object to copy from
     * @param overwrite {Boolean}        indicate if we should overwrite
     * @return {Object} the *same* target object back
     */
    provide: function(target, source, overwrite) {
      // a string means a dot separated object that gets appended to, or created
      return FB.copy(
        typeof target == 'string' ? FB.create(target) : target,
        source,
        overwrite
      );
    },

    /**
     * Generates a weak random ID.
     *
     * @access private
     * @return {String} a random ID
     */
    guid: function() {
      return 'f' + (Math.random() * (1<<30)).toString(16).replace('.', '');
    },

    /**
     * Logs a message for the developer if logging is on.
     *
     * @access private
     * @param args {Object} the thing to log
     */
    log: function(args) {
      if (FB._logging) {
        //TODO what is window.Debug, and should it instead be relying on the
        //     event fired below?
//#JSCOVERAGE_IF 0
        if (window.Debug && window.Debug.writeln) {
          window.Debug.writeln(args);
        } else if (window.console) {
          window.console.log(args);
        }
//#JSCOVERAGE_ENDIF
      }

      // fire an event if the event system is available
      if (FB.Event) {
        FB.Event.fire('fb.log', args);
      }
    },

    /**
     * Shortcut for document.getElementById
     * @method $
     * @param {string} DOM id
     * @return DOMElement
     * @access private
     */
    $: function(id) {
      return document.getElementById(id);
    }
  };
}
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.type
 * @layer basic
 * @requires fb.prelude
 */

// Provide Class/Type support.
// TODO: As a temporary hack, this docblock is written as if it describes the
// top level FB namespace. This is necessary because the current documentation
// parser uses the description from this file for some reason.
/**
 * The top level namespace exposed by the SDK. Look at the [readme on
 * **GitHub**][readme] for more information.
 *
 * [readme]: http://github.com/facebook/connect-js
 *
 * @class FB
 * @static
 */
FB.provide('', {
  /**
   * Bind a function to a given context and arguments.
   *
   * @static
   * @access private
   * @param fn {Function} the function to bind
   * @param context {Object} object used as context for function execution
   * @param {...} arguments additional arguments to be bound to the function
   * @returns {Function} the bound function
   */
  bind: function() {
    var
      args    = Array.prototype.slice.call(arguments),
      fn      = args.shift(),
      context = args.shift();
    return function() {
      return fn.apply(
        context,
        args.concat(Array.prototype.slice.call(arguments))
      );
    };
  },

  /**
   * Create a new class.
   *
   * Note: I have to use 'Class' instead of 'class' because 'class' is
   * a reserved (but unused) keyword.
   *
   * @access private
   * @param name {string} class name
   * @param constructor {function} class constructor
   * @param proto {object} instance methods for class
   */
  Class: function(name, constructor, proto) {
    if (FB.CLASSES[name]) {
      return FB.CLASSES[name];
    }

    var newClass = constructor ||  function() {};

    newClass.prototype = proto;
    newClass.prototype.bind = function(fn) {
      return FB.bind(fn, this);
    };

    newClass.prototype.constructor = newClass;
    FB.create(name, newClass);
    FB.CLASSES[name] = newClass;
    return newClass;
  },

  /**
   * Create a subclass
   *
   * Note: To call base class constructor, use this._base(...).
   * If you override a method 'foo' but still want to call
   * the base class's method 'foo', use this._callBase('foo', ...)
   *
   * @access private
   * @param {string} name class name
   * @param {string} baseName,
   * @param {function} constructor class constructor
   * @param {object} proto instance methods for class
   */
  subclass: function(name, baseName, constructor, proto) {
    if (FB.CLASSES[name]) {
      return FB.CLASSES[name];
    }
    var base = FB.create(baseName);
    FB.copy(proto, base.prototype);
    proto._base = base;
    proto._callBase = function(method) {
      var args = Array.prototype.slice.call(arguments, 1);
      return base.prototype[method].apply(this, args);
    };

    return FB.Class(
      name,
      constructor ? constructor : function() {
        if (base.apply) {
          base.apply(this, arguments);
        }
      },
      proto
    );
  },

  CLASSES: {}
});

/**
 * @class FB.Type
 * @static
 * @private
 */
FB.provide('Type', {
  isType: function(obj, type) {
    while (obj) {
      if (obj.constructor === type || obj === type) {
        return true;
      } else {
        obj = obj._base;
      }
    }
    return false;
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * Contains the public method ``FB.api`` and the internal implementation
 * ``FB.ApiServer``.
 *
 * @provides fb.api
 * @requires fb.prelude
 *           fb.qs
 *           fb.flash
 *           fb.json
 */

/**
 * API calls.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Make a API call to the [Graph API](/docs/api).
   *
   * Server-side calls are available via the JavaScript SDK that allow you to
   * build rich applications that can make API calls against the Facebook
   * servers directly from the user's browser. This can improve performance in
   * many scenarios, as compared to making all calls from your server. It can
   * also help reduce, or eliminate the need to proxy the requests thru your
   * own servers, freeing them to do other things.
   *
   * The range of APIs available covers virtually all facets of Facebook.
   * Public data such as [names][names] and [profile pictures][profilepic] are
   * available if you know the id of the user or object. Various parts of the
   * API are available depending on the [connect status and the
   * permissions](FB.login) the user has granted your application.
   *
   * Except the path, all arguments to this function are optional.
   *
   * Get the **f8 Page Object**:
   *
   *     FB.api('/f8', function(response) {
   *       alert(response.company_overview);
   *     });
   *
   * If you have an [authenticated user](FB.login), get their **User Object**:
   *
   *     FB.api('/me', function(response) {
   *       alert(response.name);
   *     });
   *
   * Get the 3 most recent **Post Objects** *Connected* to (in other words,
   * authored by) the *f8 Page Object*:
   *
   *     FB.api('/f8/posts', { limit: 3 }, function(response) {
   *       for (var i=0, l=response.length; i<l; i++) {
   *         var post = response[i];
   *         if (post.message) {
   *           alert('Message: ' + post.message);
   *         } else if (post.attachment && post.attachment.name) {
   *           alert('Attachment: ' + post.attachment.name);
   *         }
   *       }
   *     });
   *
   * If you have an [authenticated user](FB.login) with the
   * [publish_stream](/docs/authentication/permissions) permission, and want
   * to publish a new story to their feed:
   *
   *     var body = 'Reading Connect JS documentation';
   *     FB.api('/me/feed', 'post', { body: body }, function(response) {
   *       if (!response || response.error) {
   *         alert('Error occured');
   *       } else {
   *         alert('Post ID: ' + response);
   *       }
   *     });
   *
   * Or if you want a delete a previously published post:
   *
   *     var postId = '1234567890';
   *     FB.api(postId, 'delete', function(response) {
   *       if (!response || response.error) {
   *         alert('Error occured');
   *       } else {
   *         alert('Post was deleted');
   *       }
   *     });
   *
   *
   * ### Old REST API calls
   *
   * This method can also be used to invoke calls to the
   * [Old REST API](../rest/). The function signature for invoking REST API
   * calls is:
   *
   *     FB.api(params, callback)
   *
   * For example, to invoke [links.getStats](../rest/links.getStats):
   *
   *     FB.api(
   *       {
   *         method: 'links.getStats',
   *         urls: 'facebook.com,developers.facebook.com'
   *       },
   *       function(response) {
   *         alert(
   *           'Total: ' + (response[0].total_count + response[1].total_count));
   *       }
   *     );
   *
   * [names]: https://graph.facebook.com/naitik
   * [profilepic]: https://graph.facebook.com/naitik/picture
   *
   * @access public
   * @param path {String} the url path
   * @param method {String} the http method (default `"GET"`)
   * @param params {Object} the parameters for the query
   * @param cb {Function} the callback function to handle the response
   */
  api: function() {
    if (typeof arguments[0] === 'string') {
      FB.ApiServer.graph.apply(FB.ApiServer, arguments);
    } else {
      FB.ApiServer.rest.apply(FB.ApiServer, arguments);
    }
  }
});

/**
 * API call implementations.
 *
 * @class FB.ApiServer
 * @access private
 */
FB.provide('ApiServer', {
  METHODS: ['get', 'post', 'delete', 'put'],
  _callbacks: {},
  _readOnlyCalls: {
    fql_query: true,
    fql_multiquery: true,
    friends_get: true,
    notifications_get: true,
    stream_get: true,
    users_getinfo: true
  },

  /**
   * Make a API call to Graph server. This is the **real** RESTful API.
   *
   * Except the path, all arguments to this function are optional. So any of
   * these are valid:
   *
   *   FB.api('/me') // throw away the response
   *   FB.api('/me', function(r) { console.log(r) })
   *   FB.api('/me', { fields: 'email' }); // throw away response
   *   FB.api('/me', { fields: 'email' }, function(r) { console.log(r) });
   *   FB.api('/12345678', 'delete', function(r) { console.log(r) });
   *   FB.api(
   *     '/me/feed',
   *     'post',
   *     { body: 'hi there' },
   *     function(r) { console.log(r) }
   *   );
   *
   * @access private
   * @param path   {String}   the url path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  graph: function() {
    var
      args = Array.prototype.slice.call(arguments),
      path = args.shift(),
      next = args.shift(),
      method,
      params,
      cb;

    while (next) {
      var type = typeof next;
      if (type === 'string' && !method) {
        method = next.toLowerCase();
      } else if (type === 'function' && !cb) {
        cb = next;
      } else if (type === 'object' && !params) {
        params = next;
      } else {
        FB.log('Invalid argument passed to FB.api(): ' + next);
        return;
      }
      next = args.shift();
    }

    method = method || 'get';
    params = params || {};

    // remove prefix slash if one is given, as it's already in the base url
    if (path[0] === '/') {
      path = path.substr(1);
    }

    if (FB.Array.indexOf(FB.ApiServer.METHODS, method) < 0) {
      FB.log('Invalid method passed to FB.api(): ' + method);
      return;
    }

    FB.ApiServer.oauthRequest('graph', path, method, params, cb);
  },

  /**
   * Old school restserver.php calls.
   *
   * @access private
   * @param params {Object} The required arguments vary based on the method
   * being used, but specifying the method itself is mandatory:
   *
   * Property | Type    | Description                      | Argument
   * -------- | ------- | -------------------------------- | ------------
   * method   | String  | The API method to invoke.        | **Required**
   * @param cb {Function} The callback function to handle the response.
   */
  rest: function(params, cb) {
    var method = params.method.toLowerCase().replace('.', '_');
    // this is an optional dependency on FB.Auth
    // Auth.revokeAuthorization affects the session
    if (FB.Auth && method === 'auth_revokeauthorization') {
      var old_cb = cb;
      cb = function(response) {
        if (response === true) {
          FB.Auth.setSession(null, 'notConnected');
        }
        old_cb && old_cb(response);
      };
    }

    params.format = 'json-strings';
    params.api_key = FB._apiKey;
    var domain = FB.ApiServer._readOnlyCalls[method] ? 'api_read' : 'api';
    FB.ApiServer.oauthRequest(domain, 'restserver.php', 'get', params, cb);
  },

  /**
   * Add the oauth parameter, and fire off a request.
   *
   * @access private
   * @param domain {String}   the domain key, one of 'api', 'api_read',
   *                          or 'graph'
   * @param path   {String}   the request path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  oauthRequest: function(domain, path, method, params, cb) {
    // add oauth token if we have one
    if (FB._session &&
        FB._session.access_token &&
        !params.access_token) {
      params.access_token = FB._session.access_token;
    }
    params.sdk = 'joey';

    try {
      FB.ApiServer.jsonp(domain, path, method, FB.JSON.flatten(params), cb);
    } catch (x) {
      if (FB.Flash.hasMinVersion()) {
        FB.ApiServer.flash(domain, path, method, FB.JSON.flatten(params), cb);
      } else {
        throw new Error('Flash is required for this API call.');
      }
    }
  },

  /**
   * Basic JSONP Support.
   *
   * @access private
   * @param domain {String}   the domain key, one of 'api', 'api_read',
   *                          or 'graph'
   * @param path   {String}   the request path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  jsonp: function(domain, path, method, params, cb) {
    var
      g      = FB.guid(),
      script = document.createElement('script');

    // jsonp needs method overrides as the request itself is always a GET
    if (domain === 'graph' && method !== 'get') {
      params.method = method;
    }
    params.callback = 'FB.ApiServer._callbacks.' + g;

    var url = (
      FB._domain[domain] + path +
      (path.indexOf('?') > -1 ? '&' : '?') +
      FB.QS.encode(params)
    );
    if (url.length > 2000) {
      throw new Error('JSONP only support a maximum of 2000 bytes of input.');
    }

    // this is the JSONP callback invoked by the response
    FB.ApiServer._callbacks[g] = function(response) {
      cb && cb(response);
      delete FB.ApiServer._callbacks[g];
      script.parentNode.removeChild(script);
    };

    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
  },

  /**
   * Flash based HTTP Client.
   *
   * @access private
   * @param domain {String}   the domain key, one of 'api' or 'graph'
   * @param path   {String}   the request path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  flash: function(domain, path, method, params, cb) {
    if (!window.FB_OnXdHttpResult) {
      // the SWF calls this global function when a HTTP response is available
      // FIXME: remove global
      window.FB_OnXdHttpResult = function(reqId, data) {
        FB.ApiServer._callbacks[reqId](decodeURIComponent(data));
      };
    }

    FB.Flash.onReady(function() {
      var
        url  = FB._domain[domain] + path,
        body = FB.QS.encode(params);

      if (method === 'get') {
        // convert GET to POST if needed based on URL length
        if (url.length + body.length > 2000) {
          if (domain === 'graph') {
            params.method = 'get';
          }
          method = 'post';
          body = FB.QS.encode(params);
        } else {
          url += (url.indexOf('?') > -1 ? '&' : '?') + body;
          body = '';
        }
      } else if (method !== 'post') {
        // we use method override and do a POST for PUT/DELETE as flash has
        // trouble otherwise
        if (domain === 'graph') {
          params.method = method;
        }
        method = 'post';
        body = FB.QS.encode(params);
      }

      // fire the request
      var reqId = document.XdComm.sendXdHttpRequest(
        method.toUpperCase(), url, body, null);

      // callback
      FB.ApiServer._callbacks[reqId] = function(response) {
        cb && cb(FB.JSON.parse(response));
        delete FB.ApiServer._callbacks[reqId];
      };
    });
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.auth
 * @requires fb.prelude
 *           fb.qs
 *           fb.event
 *           fb.json
 *           fb.ui
 */

/**
 * Authentication, Authorization & Sessions.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Find out the current status from the server, and get a session if the user
   * is connected.
   *
   * The user's status or the question of *who is the current user* is
   * the first thing you will typically start with. For the answer, we
   * ask facebook.com. Facebook will answer this question in one of
   * two ways:
   *
   * 1. Someone you don't know.
   * 2. Someone you know and have interacted with. Here's a session for them.
   *
   * Here's how you find out:
   *
   *     FB.getLoginStatus(function(response) {
   *       if (response.session) {
   *         // logged in and connected user, someone you know
   *       } else {
   *         // no user session available, someone you dont know
   *       }
   *     });
   *
   * The example above will result in the callback being invoked **once**
   * on load based on the session from www.facebook.com. JavaScript applications
   * are typically written with heavy use of events, and the SDK **encourages**
   * this by exposing various events. These are fired by the various
   * interactions with authentication flows, such as [FB.login()][login] or
   * [[wiki:fb:login-button]]. Widgets such as [[wiki:fb:comments (XFBML)]]
   * may also trigger authentication.
   *
   * **Events**
   *
   * #### auth.login
   * This event is fired when your application first notices the user (in other
   * words, gets a session when it didn't already have a valid one).
   * #### auth.logout
   * This event is fired when your application notices that there is no longer
   * a valid user (in other words, it had a session but can no longer validate
   * the current user).
   * #### auth.sessionChange
   * This event is fired for **any** auth related change as they all affect the
   * session: login, logout, session refresh. Sessions are refreshed over time
   * as long as the user is active with your application.
   * #### auth.statusChange
   * Typically you will want to use the auth.sessionChange event. But in rare
   * cases, you want to distinguish between these three states:
   *
   * - Connected
   * - Logged into Facebook but not connected with your application
   * - Not logged into Facebook at all.
   *
   * The [FB.Event.subscribe][subscribe] and
   * [FB.Event.unsubscribe][unsubscribe] functions are used to subscribe to
   * these events. For example:
   *
   *     FB.Event.subscribe('auth.login', function(response) {
   *       // do something with response
   *     });
   *
   * The response object returned to all these events is the same as the
   * response from [FB.getLoginStatus][getLoginStatus], [FB.login][login] or
   * [FB.logout][logout]. This response object contains:
   *
   * status
   * : The status of the User. One of `connected`, `notConnected` or `unknown`.
   *
   * session
   * : The session object.
   *
   * perms
   * : The comma separated permissions string. This is specific to a
   *   permissions call. It is not persistent.
   *
   * [subscribe]: /docs/reference/javascript/FB.Event.subscribe
   * [unsubscribe]: /docs/reference/javascript/FB.Event.unsubscribe
   * [getLoginStatus]: /docs/reference/javascript/FB.getLoginStatus
   * [login]: /docs/reference/javascript/FB.login
   * [logout]: /docs/reference/javascript/FB.logout
   *
   * @access public
   * @param cb {Function} The callback function.
   * @param force {Boolean} Force reloading the login status (default `false`).
   */
  getLoginStatus: function(cb, force) {
    if (!FB._apiKey) {
      FB.log('FB.getLoginStatus() called before calling FB.init().');
      return;
    }

    // we either invoke the callback right away if the status has already been
    // loaded, or queue it up for when the load is done.
    if (cb) {
      if (!force && FB.Auth._loadState == 'loaded') {
        cb({ status: FB._userStatus, session: FB._session });
        return;
      } else {
        FB.Event.subscribe('FB.loginStatus', cb);
      }
    }

    // if we're already loading, and this is not a force load, we're done
    if (!force && FB.Auth._loadState == 'loading') {
      return;
    }

    FB.Auth._loadState = 'loading';

    // invoke the queued sessionLoad callbacks
    var lsCb = function(response) {
      // done
      FB.Auth._loadState = 'loaded';

      // invoke callbacks
      FB.Event.fire('FB.loginStatus', response);
      FB.Event.clear('FB.loginStatus');
    };

    // finally make the call to login status
    FB.ui({ method: 'auth.status', display: 'hidden' }, lsCb);
  },

  /**
   * *Synchronous* accessor for the current Session. The **synchronous**
   * nature of this method is what sets it apart from the other login methods.
   * It is similar in nature to [FB.getLoginStatus()][FB.getLoginStatus], but
   * it just **returns** the session. Many parts of your application already
   * *assume* the user is connected with your application. In such cases, you
   * may want to avoid the overhead of making asynchronous calls.
   *
   * NOTE: You should never use this method at *page load* time. Generally, it
   * is safer to use [FB.getLoginStatus()][FB.getLoginStatus] if you are
   * unsure.
   *
   * [FB.getLoginStatus]: /docs/reference/javascript/FB.getLoginStatus
   *
   * @access public
   * @return {Object} the current Session if available, `null` otherwise
   */
  getSession: function() {
    return FB._session;
  },

  /**
   * Login/Authorize/Permissions.
   *
   * Once you have determined the user's status, you may need to
   * prompt the user to login. It is best to delay this action to
   * reduce user friction when they first arrive at your site. You can
   * then prompt and show them the "Connect with Facebook" button
   * bound to an event handler which does the following:
   *
   *     FB.login(function(response) {
   *       if (response.session) {
   *         // user successfully logged in
   *       } else {
   *         // user cancelled login
   *       }
   *     });
   *
   * You should **only** call this on a user event as it opens a
   * popup. Most browsers block popups, _unless_ they were initiated
   * from a user event, such as a click on a button or a link.
   *
   *
   * Depending on your application's needs, you may need additional
   * permissions from the user. A large number of calls do not require
   * any additional permissions, so you should first make sure you
   * need a permission. This is a good idea because this step
   * potentially adds friction to the user's process. Another point to
   * remember is that this call can be made even _after_ the user has
   * first connected. So you may want to delay asking for permissions
   * until as late as possible:
   *
   *     FB.login(function(response) {
   *       if (response.session) {
   *         if (response.perms) {
   *           // user is logged in and granted some permissions.
   *           // perms is a comma separated list of granted permissions
   *         } else {
   *           // user is logged in, but did not grant any permissions
   *         }
   *       } else {
   *         // user is not logged in
   *       }
   *     }, {perms:'read_stream,publish_stream,offline_access'});
   *
   * @access public
   * @param cb {Function} The callback function.
   * @param opts {Object} (_optional_) Options to modify login behavior.
   *
   * Name                     | Type    | Description
   * ------------------------ | ------- | --------------------------------------------------------------------------------
   * perms                    | String  | Comma separated list of [Extended permissions](/docs/authentication/permissions)
   * enable_profile_selector  | Boolean | When true, prompt the user to grant permission for one or more Pages.
   * profile_selector_ids     | String  | Comma separated list of IDs to display in the profile selector.
   */
  login: function(cb, opts) {
    opts = FB.copy({ method: 'auth.login', display: 'popup' }, opts || {});
    FB.ui(opts, cb);
  },

  /**
   * Logout the user in the background.
   *
   * Just like logging in is tied to facebook.com, so is logging out -- and
   * this call logs the user out of both Facebook and your site. This is a
   * simple call:
   *
   *     FB.logout(function(response) {
   *       // user is now logged out
   *     });
   *
   * NOTE: You can only log out a user that is connected to your site.
   *
   * @access public
   * @param cb {Function} The callback function.
   */
  logout: function(cb) {
    FB.ui({ method: 'auth.logout', display: 'hidden' }, cb);
  }
});

/**
 * Internal Authentication implementation.
 *
 * @class FB.Auth
 * @static
 * @access private
 */
FB.provide('Auth', {
  // pending callbacks for FB.getLoginStatus() calls
  _callbacks: [],

  /**
   * Set a new session value. Invokes all the registered subscribers
   * if needed.
   *
   * @access private
   * @param session {Object}  the new Session
   * @param status  {String}  the new status
   * @return       {Object}  the "response" object
   */
  setSession: function(session, status) {
    // detect special changes before changing the internal session
    var
      login         = !FB._session && session,
      logout        = FB._session && !session,
      both          = FB._session && session && FB._session.uid != session.uid,
      sessionChange = login || logout || (FB._session && session &&
                         FB._session.session_key != session.session_key),
      statusChange  = status != FB._userStatus;

    var response = {
      session : session,
      status  : status
    };

    FB._session = session;
    FB._userStatus = status;

    // If cookie support is enabled, set the cookie. Cookie support does not
    // rely on events, because we want the cookie to be set _before_ any of the
    // event handlers are fired. Note, this is a _weak_ dependency on Cookie.
    if (sessionChange && FB.Cookie && FB.Cookie.getEnabled()) {
      FB.Cookie.set(session);
    }

    // events
    if (statusChange) {
      /**
       * Fired when the status changes.
       *
       * @event auth.statusChange
       */
      FB.Event.fire('auth.statusChange', response);
    }
    if (logout || both) {
      /**
       * Fired when a logout action is performed.
       *
       * @event auth.logout
       */
      FB.Event.fire('auth.logout', response);
    }
    if (login || both) {
      /**
       * Fired when a login action is performed.
       *
       * @event auth.login
       */
      FB.Event.fire('auth.login', response);
    }
    if (sessionChange) {
      /**
       * Fired when the session changes. This includes a session being
       * refreshed, or a login or logout action.
       *
       * @event auth.sessionChange
       */
      FB.Event.fire('auth.sessionChange', response);
    }

    // re-setup a timer to refresh the session if needed. we only do this if
    // FB.Auth._loadState exists, indicating that the application relies on the
    // JS to get and refresh session information (vs managing it themselves).
    if (FB.Auth._refreshTimer) {
      window.clearTimeout(FB.Auth._refreshTimer);
      delete FB.Auth._refreshTimer;
    }
    if (FB.Auth._loadState && session && session.expires) {
      // refresh every 20 minutes. we don't rely on the expires time because
      // then we would also need to rely on the local time available in JS
      // which is often incorrect.
      FB.Auth._refreshTimer = window.setTimeout(function() {
        FB.getLoginStatus(null, true); // force refresh
      }, 1200000); // 20 minutes
    }

    return response;
  },

  /**
   * This handles receiving a session from:
   *  - login_status.php
   *  - login.php
   *  - tos.php
   *
   * It also (optionally) handles the ``xxRESULTTOKENxx`` response from:
   *  - prompt_permissions.php
   *
   * And calls the given callback with::
   *
   *   {
   *     session: session or null,
   *     status: 'unknown' or 'notConnected' or 'connected',
   *     perms: comma separated string of perm names
   *   }
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   the frame id for the callback is tied to
   * @param target    {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @param status    {String}   the connect status this handler will trigger
   * @param session   {Object}   backup session, if none is found in response
   * @return         {String}   the xd url bound to the callback
   */
  xdHandler: function(cb, frame, target, isDefault, status, session) {
    return FB.UIServer._xdNextHandler(function(params) {
      try {
        session = FB.JSON.parse(params.session);
      } catch (x) {
        // ignore parse errors
      }
      var response = FB.Auth.setSession(session || null, status);

      // incase we were granted some new permissions
      response.perms = (
        params.result != 'xxRESULTTOKENxx' && params.result || '');

      // user defined callback
      cb && cb(response);
    }, frame, target, isDefault) + '&result=xxRESULTTOKENxx';
  }
});

FB.provide('UIServer.Methods', {
  'auth.login': {
    size      : { width: 627, height: 326 },
    url       : 'login.php',
    transform : function(call) {
      //FIXME
      if (!FB._apiKey) {
        FB.log('FB.login() called before calling FB.init().');
        return;
      }

      // if we already have a session and permissions are not being requested,
      // we just fire the callback
      if (FB._session && !call.params.perms) {
        FB.log('FB.login() called when user is already connected.');
        call.cb && call.cb({ status: FB._userStatus, session: FB._session });
        return;
      }

      var
        xdHandler = FB.Auth.xdHandler,
        cb        = call.cb,
        id        = call.id,
        session   = FB._session,
        cancel    = xdHandler(
          cb,
          id,
          'opener',
          true, // isDefault
          FB._userStatus,
          session),
        next      = xdHandler(
          cb,
          id,
          'opener',
          false, // isDefault
          'connected',
          session);

      FB.copy(call.params, {
        cancel_url              : cancel,
        channel_url             : window.location.toString(),
        next                    : next,
        fbconnect               : FB._inCanvas ? 0 : 1,
        req_perms               : call.params.perms,
        enable_profile_selector : call.params.enable_profile_selector,
        profile_selector_ids    : call.params.profile_selector_ids,
        return_session          : 1,
        session_version         : 3,
        v                       : '1.0'
      });
      delete call.cb;
      delete call.params.perms; //TODO fix name to be the same on server

      return call;
    }
  },

  'auth.logout': {
    url       : 'logout.php',
    transform : function(call) {
      //FIXME make generic
      if (!FB._apiKey) {
        FB.log('FB.logout() called before calling FB.init().');
      } else if (!FB._session) {
        FB.log('FB.logout() called without a session.');
      } else {
        call.params.next = FB.Auth.xdHandler(
          call.cb, call.id, 'parent', false, 'unknown');
        return call;
      }
    }
  },

  'auth.status': {
    url       : 'extern/login_status.php',
    transform : function(call) {
      var
        cb = call.cb,
        id = call.id,
        xdHandler = FB.Auth.xdHandler;
      delete call.cb;
      FB.copy(call.params, {
        no_session : xdHandler(cb, id, 'parent', false, 'notConnected'),
        no_user    : xdHandler(cb, id, 'parent', false, 'unknown'),
        ok_session : xdHandler(cb, id, 'parent', false, 'connected'),
        session_version : 3,
        extern: FB._inCanvas ? 0 : 2
      });
      return call;
    }
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.canvas
 * @requires fb.prelude
 *           fb.array
 *           fb.content
 *           fb.qs
 */

/**
 * Things used by Canvas apps.
 *
 * ---------------------------------------------------------------------
 * IMPORTANT NOTE: IF YOU ARE USING THESE FUNCTIONS, MAKE SURE YOU GO TO
 *
 * http://www.facebook.com/developers
 *
 * CLICK YOUR APP, CLICK EDIT SETTINGS, CLICK MIGRATIONS AND ENABLE
 *
 * New SDKs
 * ---------------------------------------------------------------------
 *
 * @class FB.Canvas
 * @static
 * @access private
 */
FB.provide('Canvas', {
  /**
   * The timer. We keep it around so we can shut if off
   */
  _timer: null,

  /**
   * Tells Facebook to resize your iframe.
   *
   * ## Migration Requirement
   *
   * To use this function, you MUST have enabled the *New SDKs*
   * [migration](http://developers.facebook.com/blog/post/363).
   *
   * ## Examples
   *
   * Call this whenever you need a resize. This usually means, once after
   * pageload, and whenever your content size changes.
   *
   *     window.fbAsyncInit = function() {
   *       FB.Canvas.setSize();
   *     }
   *
   *     // Do things that will sometimes call sizeChangeCallback()
   *
   *     function sizeChangeCallback() {
   *       FB.Canvas.setSize();
   *     }
   *
   * It will default to the current size of the frame, but if you have a need
   * to pick your own size, you can use the params array.
   *
   *     FB.Canvas.setSize({ width: 640, height: 480 }); // Live in the past
   *
   * The max width is whatever you picked in your app settings, and there is no
   * max height.
   *
   * @param {Object} params
   *
   * Property | Type    | Description                      | Argument   | Default
   * -------- | ------- | -------------------------------- | ---------- | -------
   * width    | Integer | Desired width. Max is app width. | *Optional* | frame width
   * height   | Integer | Desired height.                  | *Optional* | frame height
   *
   * @author ptarjan
   */
  setSize: function(params) {
    // setInterval calls its function with an integer
    if (typeof params != "object") {
      params = {};
    }
    params = FB.copy(params || {}, FB.Canvas._computeContentSize());

    // Deep compare
    if (FB.Canvas._lastSize &&
        FB.Canvas._lastSize.width == params.width &&
        FB.Canvas._lastSize.height == params.height) {
      return false;
    }
    FB.Canvas._lastSize = params;

    FB.Canvas._sendMessageToFacebook({
      method: 'setSize',
      params: params
    });
    return true;
  },

  /**
   * Starts or stops a timer which resizes your iframe every few milliseconds.
   *
   * Used to be known as:
   * [startTimerToSizeToContent](http://wiki.developers.facebook.com/index.php/Resizable_IFrame)
   *
   * ## Migration Requirement
   *
   * To use this function, you MUST have enabled the *New SDKs*
   * [migration](http://developers.facebook.com/blog/post/363).
   *
   * ## Examples
   *
   * This function is useful if you know your content will change size, but you
   * don't know when. There will be a slight delay, so if you know when your
   * content changes size, you should call [setSize](FB.Canvas.setSize)
   * yourself (and save your user's CPU cycles).
   *
   *     window.fbAsyncInit = function() {
   *       FB.Canvas.setAutoResize();
   *     }
   *
   * If you ever need to stop the timer, just pass false.
   *
   *     FB.Canvas.setAutoResize(false);
   *
   * If you want the timer to run at a different interval, you can do that too.
   *
   *     FB.Canvas.setAutoResize(91); // Paul's favourite number
   *
   * Note: If there is only 1 parameter and it is a number, it is assumed to be
   * the interval.
   *
   * @param {Boolean} onOrOff Whether to turn the timer on or off. truthy ==
   * on, falsy == off. **default** is true
   * @param {Integer} interval How often to resize (in ms). **default** is
   * 100ms
   *
   * @author ptarjan
   */
  setAutoResize: function(onOrOff, interval) {
    // I did this a few times, so I expect many users will too
    if (interval === undefined && typeof onOrOff == "number") {
      interval = onOrOff;
      onOrOff = true;
    }

    if (onOrOff === undefined || onOrOff) {
      if (FB.Canvas._timer === null) {
        FB.Canvas._timer =
          window.setInterval(FB.Canvas.setSize,
                             interval || 100); // 100 ms is the default
      }
      FB.Canvas.setSize();
    } else {
      if (FB.Canvas._timer !== null) {
        window.clearInterval(FB.Canvas._timer);
        FB.Canvas._timer = null;
      }
    }
  },

  /**
   * Determine the size of the actual contents of the iframe.
   *
   * This is the same number jQuery seems to give for
   * $(document).height() but still causes a scrollbar in some browsers
   * on some sites.
   * Patches and test cases are welcome.
   */
  _computeContentSize: function() {
    var body = document.body,
        docElement = document.documentElement,
        right = 0,
        bottom = Math.max(
          Math.max(body.offsetHeight, body.scrollHeight) +
            body.offsetTop,
          Math.max(docElement.offsetHeight, docElement.scrollHeight) +
            docElement.offsetTop);

    if (body.offsetWidth < body.scrollWidth) {
      right = body.scrollWidth + body.offsetLeft;
    } else {
      FB.Array.forEach(body.childNodes, function(child) {
        var childRight = child.offsetWidth + child.offsetLeft;
        if (childRight > right) {
          right = childRight;
        }
      });
    }
    if (docElement.clientLeft > 0) {
      right += (docElement.clientLeft * 2);
    }
    if (docElement.clientTop > 0) {
      bottom += (docElement.clientTop * 2);
    }

    return {height: bottom, width: right};
  },

  /**
   * Sends a request back to facebook.
   *
   * @author ptarjan
   */
  _sendMessageToFacebook: function(message) {
    var url = FB._domain.staticfb + 'connect/canvas_proxy.php#' +
      FB.QS.encode({method: message.method,
                    params: FB.JSON.stringify(message.params)});

     var root = FB.Content.appendHidden('');
     FB.Content.insertIframe({
       url: url,
       root: root,
       width: 1,
       height: 1,
       onload: function() {
         setTimeout(function() {
           root.parentNode.removeChild(root);
         }, 10);
       }
     });
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.content
 * @requires fb.prelude fb.array
 */

/**
 * "Content" is a very flexible term. Helpers for things like hidden
 * DOM content, iframes and popups.
 *
 * @class FB.Content
 * @static
 * @access private
 */
FB.provide('Content', {
  _root       : null,
  _hiddenRoot : null,
  _callbacks  : {},

  /**
   * Append some content.
   *
   * @access private
   * @param content {String|Node} a DOM Node or HTML string
   * @param root    {Node}        (optional) a custom root node
   * @return {Node} the node that was just appended
   */
  append: function(content, root) {
    // setup the root node, creating it if necessary
    if (!root) {
      if (!FB.Content._root) {
        FB.Content._root = root = FB.$('fb-root');
        if (!root) {
          FB.log('The "fb-root" div has not been created.');
          return;
        } else {
          root.className += ' fb_reset';
        }
      } else {
        root = FB.Content._root;
      }
    }

    if (typeof content == 'string') {
      var div = document.createElement('div');
      root.appendChild(div).innerHTML = content;
      return div;
    } else {
      return root.appendChild(content);
    }
  },

  /**
   * Append some hidden content.
   *
   * @access private
   * @param content {String|Node} a DOM Node or HTML string
   * @return {Node} the node that was just appended
   */
  appendHidden: function(content) {
    if (!FB.Content._hiddenRoot) {
      var
        hiddenRoot = document.createElement('div'),
        style      = hiddenRoot.style;
      style.position = 'absolute';
      style.top      = '-10000px';
      style.width    = style.height = 0;
      FB.Content._hiddenRoot = FB.Content.append(hiddenRoot);
    }

    return FB.Content.append(content, FB.Content._hiddenRoot);
  },

  /**
   * Insert a new iframe. Unfortunately, its tricker than you imagine.
   *
   * NOTE: These iframes have no border, overflow hidden and no scrollbars.
   *
   * The opts can contain:
   *   root       DOMElement  required root node (must be empty)
   *   url        String      required iframe src attribute
   *   className  String      optional class attribute
   *   height     Integer     optional height in px
   *   id         String      optional id attribute
   *   name       String      optional name attribute
   *   onload     Function    optional onload handler
   *   width      Integer     optional width in px
   *
   * @access private
   * @param opts {Object} the options described above
   */
  insertIframe: function(opts) {
    //
    // Browsers evolved. Evolution is messy.
    //
    opts.id = opts.id || FB.guid();
    opts.name = opts.name || FB.guid();

    // Dear IE, screw you. Only works with the magical incantations.
    // Dear FF, screw you too. Needs src _after_ DOM insertion.
    // Dear Webkit, you're okay. Works either way.
    var
      guid = FB.guid(),

      // Since we set the src _after_ inserting the iframe node into the DOM,
      // some browsers will fire two onload events, once for the first empty
      // iframe insertion and then again when we set the src. Here some
      // browsers are Webkit browsers which seem to be trying to do the
      // "right thing". So we toggle this boolean right before we expect the
      // correct onload handler to get fired.
      srcSet = false,
      onloadDone = false;
    FB.Content._callbacks[guid] = function() {
      if (srcSet && !onloadDone) {
        onloadDone = true;
        opts.onload && opts.onload(opts.root.firstChild);
      }
    };

//#JSCOVERAGE_IF
    if (document.attachEvent) {
      var html = (
        '<iframe' +
          ' id="' + opts.id + '"' +
          ' name="' + opts.name + '"' +
          (opts.className ? ' class="' + opts.className + '"' : '') +
          ' style="border:none;' +
                  (opts.width ? 'width:' + opts.width + 'px;' : '') +
                  (opts.height ? 'height:' + opts.height + 'px;' : '') +
                  '"' +
          ' src="' + opts.url + '"' +
          ' frameborder="0"' +
          ' scrolling="no"' +
          ' allowtransparency="true"' +
          ' onload="FB.Content._callbacks.' + guid + '()"' +
        '></iframe>'
      );

      // There is an IE bug with iframe caching that we have to work around. We
      // need to load a dummy iframe to consume the initial cache stream. The
      // setTimeout actually sets the content to the HTML we created above, and
      // because its the second load, we no longer suffer from cache sickness.
      // It must be javascript:false instead of about:blank, otherwise IE6 will
      // complain in https.
      // Since javascript:false actually result in an iframe containing the
      // string 'false', we set the iframe height to 1px so that it gets loaded
      // but stays invisible.
      opts.root.innerHTML = '<iframe src="javascript:false"'+
                            ' frameborder="0"'+
                            ' scrolling="no"'+
                            ' style="height:1px"></iframe>';

      // Now we'll be setting the real src.
      srcSet = true;

      // You may wonder why this is a setTimeout. Read the IE source if you can
      // somehow get your hands on it, and tell me if you figure it out. This
      // is a continuation of the above trick which apparently does not work if
      // the innerHTML is changed right away. We need to break apart the two
      // with this setTimeout 0 which seems to fix the issue.
      window.setTimeout(function() {
        opts.root.innerHTML = html;
      }, 0);
    } else {
      // This block works for all non IE browsers. But it's specifically
      // designed for FF where we need to set the src after inserting the
      // iframe node into the DOM to prevent cache issues.
      var node = document.createElement('iframe');
      node.id = opts.id;
      node.name = opts.name;
      node.onload = FB.Content._callbacks[guid];
      node.style.border = 'none';
      node.style.overflow = 'hidden';
      if (opts.className) {
        node.className = opts.className;
      }
      if (opts.height) {
        node.style.height = opts.height + 'px';
      }
      if (opts.width) {
        node.style.width = opts.width + 'px';
      }
      opts.root.appendChild(node);

      // Now we'll be setting the real src.
      srcSet = true;

      node.src = opts.url;
    }
  },

  /**
   * Dynamically generate a <form> and POST it to the given target.
   *
   * The opts MUST contain:
   *   url     String  action URL for the form
   *   target  String  the target for the form
   *   params  Object  the key/values to be used as POST input
   *
   * @access protected
   * @param opts {Object} the options
   */
  postTarget: function(opts) {
    var form = document.createElement('form');
    form.action = opts.url;
    form.target = opts.target;
    form.method = 'POST';
    FB.Content.appendHidden(form);

    FB.Array.forEach(opts.params, function(val, key) {
      if (val !== null && val !== undefined) {
        var input = document.createElement('input');
        input.name = key;
        input.value = val;
        form.appendChild(input);
      }
    });

    form.submit();
    form.parentNode.removeChild(form);
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.cookie
 * @requires fb.prelude
 *           fb.qs
 *           fb.event
 */

/**
 * Cookie Support.
 *
 * @class FB.Cookie
 * @static
 * @access private
 */
FB.provide('Cookie', {
  /**
   * Holds the base_domain property to match the Cookie domain.
   *
   * @access private
   * @type String
   */
  _domain: null,

  /**
   * Indicate if Cookie support should be enabled.
   *
   * @access private
   * @type Boolean
   */
  _enabled: false,

  /**
   * Enable or disable Cookie support.
   *
   * @access private
   * @param val {Boolean} true to enable, false to disable
   */
  setEnabled: function(val) {
    FB.Cookie._enabled = val;
  },

  /**
   * Return the current status of the cookie system.
   *
   * @access private
   * @returns {Boolean} true if Cookie support is enabled
   */
  getEnabled: function() {
    return FB.Cookie._enabled;
  },

  /**
   * Try loading the session from the Cookie.
   *
   * @access private
   * @return {Object} the session object from the cookie if one is found
   */
  load: function() {
    var
      // note, we have the opening quote for the value in the regex, but do
      // not have a closing quote. this is because the \b already handles it.
      cookie = document.cookie.match('\\bfbs_' + FB._apiKey + '="([^;]*)\\b'),
      session;

    if (cookie) {
      // url encoded session stored as "sub-cookies"
      session = FB.QS.decode(cookie[1]);
      // decodes as a string, convert to a number
      session.expires = parseInt(session.expires, 10);
      // capture base_domain for use when we need to clear
      FB.Cookie._domain = session.base_domain;
    }

    return session;
  },

  /**
   * Helper function to set cookie value.
   *
   * @access private
   * @param val    {String} the string value (should already be encoded)
   * @param ts     {Number} a unix timestamp denoting expiry
   * @param domain {String} optional domain for cookie
   */
  setRaw: function(val, ts, domain) {
    document.cookie =
      'fbs_' + FB._apiKey + '="' + val + '"' +
      (val && ts == 0 ? '' : '; expires=' + new Date(ts * 1000).toGMTString()) +
      '; path=/' +
      (domain ? '; domain=.' + domain : '');

    // capture domain for use when we need to clear
    FB.Cookie._domain = domain;
  },

  /**
   * Set the cookie using the given session object.
   *
   * @access private
   * @param session {Object} the session object
   */
  set: function(session) {
    session
      ? FB.Cookie.setRaw(
          FB.QS.encode(session),
          session.expires,
          session.base_domain)
      : FB.Cookie.clear();
  },

  /**
   * Clear the cookie.
   *
   * @access private
   */
  clear: function() {
    FB.Cookie.setRaw('', 0, FB.Cookie._domain);
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.dialog
 * @requires fb.prelude
 *           fb.intl
 *           fb.array
 *           fb.content
 *           fb.dom
 *           fb.css.dialog
 */

/**
 * Dialog creation and management.
 *
 * @class FB.Dialog
 * @static
 * @private
 */
FB.provide('Dialog', {
  /**
   * The loader element.
   *
   * @access private
   * @type DOMElement
   */
  _loaderEl: null,

  /**
   * The stack of active dialogs.
   *
   * @access private
   * @type Array
   */
  _stack: [],

  /**
   * The currently visible dialog.
   *
   * @access private
   * @type DOMElement
   */
  _active: null,

  /**
   * Find the root dialog node for a given element. This will walk up the DOM
   * tree and while a node exists it will check to see if has the fb_dialog
   * class and if it does returns it.
   *
   * @access private
   * @param node {DOMElement} a child node of the dialog
   * @return {DOMElement} the root dialog element if found
   */
  _findRoot: function(node) {
    while (node) {
      if (FB.Dom.containsCss(node, 'fb_dialog')) {
        return node;
      }
      node = node.parentNode;
    }
  },

  /**
   * Show the "Loading..." dialog. This is a special dialog which does not
   * follow the standard stacking semantics. If a callback is provided, a
   * cancel action is provided using the "X" icon.
   *
   * @access private
   * @param cb {Function} optional callback for the "X" action
   */
  _showLoader: function(cb) {
    if (!FB.Dialog._loaderEl) {
      FB.Dialog._loaderEl = FB.Dialog._findRoot(FB.Dialog.create({
        content: (
          '<div class="fb_dialog_loader">' +
            FB.Intl.tx('sh:loading') +
            '<a id="fb_dialog_loader_close"></a>' +
          '</div>'
        )
      }));
    }

    // this needs to be done for each invocation of _showLoader. since we don't
    // stack loaders and instead simply hold on to the last one, it is possible
    // that we are showing nothing when we can potentially be showing the
    // loading dialog for a previously activated but not yet loaded dialog.
    var loaderClose = FB.$('fb_dialog_loader_close');
    if (cb) {
      FB.Dom.removeCss(loaderClose, 'fb_hidden');
      loaderClose.onclick = function() {
        FB.Dialog._hideLoader();
        cb();
      };
    } else {
      FB.Dom.addCss(loaderClose, 'fb_hidden');
      loaderClose.onclick = null;
    }

    FB.Dialog._makeActive(FB.Dialog._loaderEl);
  },

  /**
   * Hide the loading dialog if one is being shown.
   *
   * @access private
   */
  _hideLoader: function() {
    if (FB.Dialog._loaderEl && FB.Dialog._loaderEl == FB.Dialog._active) {
      FB.Dialog._loaderEl.style.top = '-10000px';
    }
  },

  /**
   * Center a dialog based on its current dimensions and place it in the
   * visible viewport area.
   *
   * @access private
   * @param el {DOMElement} the dialog node
   */
  _makeActive: function(el) {
    FB.Dialog._lowerActive();
    var
      dialog = {
        width  : parseInt(el.offsetWidth, 10),
        height : parseInt(el.offsetHeight, 10)
      },
      view   = FB.Dom.getViewportInfo(),
      left   = (view.scrollLeft + (view.width - dialog.width) / 2),
      top    = (view.scrollTop + (view.height - dialog.height) / 2.5);
    el.style.left = (left > 0 ? left : 0) + 'px';
    el.style.top = (top > 0 ? top : 0) + 'px';
    FB.Dialog._active = el;
  },

  /**
   * Lower the current active dialog if there is one.
   *
   * @access private
   * @param node {DOMElement} the dialog node
   */
  _lowerActive: function() {
    if (!FB.Dialog._active) {
      return;
    }
    FB.Dialog._active.style.top = '-10000px';
    FB.Dialog._active = null;
  },

  /**
   * Remove the dialog from the stack.
   *
   * @access private
   * @param node {DOMElement} the dialog node
   */
  _removeStacked: function(dialog) {
    FB.Dialog._stack = FB.Array.filter(FB.Dialog._stack, function(node) {
      return node != dialog;
    });
  },

  /**
   * Create a dialog. Returns the node of the dialog within which the caller
   * can inject markup. Optional HTML string or a DOMElement can be passed in
   * to be set as the content. Note, the dialog is hidden by default.
   *
   * @access protected
   * @param opts {Object} Options:
   * Property  | Type              | Description                       | Default
   * --------- | ----------------- | --------------------------------- | -------
   * content   | String|DOMElement | HTML String or DOMElement         |
   * loader    | Boolean           | `true` to show the loader dialog  | `false`
   * onClose   | Boolean           | callback if closed                |
   * closeIcon | Boolean           | `true` to show close icon         | `false`
   * visible   | Boolean           | `true` to make visible            | `false`
   *
   * @return {DOMElement} the dialog content root
   */
  create: function(opts) {
    opts = opts || {};
    if (opts.loader) {
      FB.Dialog._showLoader(opts.onClose);
    }

    var
      dialog      = document.createElement('div'),
      contentRoot = document.createElement('div'),
      className   = 'fb_dialog';

    // optional close icon
    if (opts.closeIcon && opts.onClose) {
      var closeIcon = document.createElement('a');
      closeIcon.className = 'fb_dialog_close_icon';
      closeIcon.onclick = opts.onClose;
      dialog.appendChild(closeIcon);
    }

    // handle rounded corners j0nx
//#JSCOVERAGE_IF
    if (FB.Dom.getBrowserType() == 'ie') {
      className += ' fb_dialog_legacy';
      FB.Array.forEach(
        [
          'vert_left',
          'vert_right',
          'horiz_top',
          'horiz_bottom',
          'top_left',
          'top_right',
          'bottom_left',
          'bottom_right'
        ],
        function(name) {
          var span = document.createElement('span');
          span.className = 'fb_dialog_' + name;
          dialog.appendChild(span);
        }
      );
    } else {
      className += ' fb_dialog_advanced';
    }

    if (opts.content) {
      FB.Content.append(opts.content, contentRoot);
    }

    dialog.className = className;
    contentRoot.className = 'fb_dialog_content';

    dialog.appendChild(contentRoot);
    FB.Content.append(dialog);

    if (opts.visible) {
      FB.Dialog.show(dialog);
    }

    return contentRoot;
  },

  /**
   * Raises the given dialog. Any active dialogs are automatically lowered. An
   * active loading indicator is suppressed. An already-lowered dialog will be
   * raised and it will be put at the top of the stack. A dialog never shown
   * before will be added to the top of the stack.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  show: function(dialog) {
    dialog = FB.Dialog._findRoot(dialog);
    if (dialog) {
      FB.Dialog._removeStacked(dialog);
      FB.Dialog._hideLoader();
      FB.Dialog._makeActive(dialog);
      FB.Dialog._stack.push(dialog);
    }
  },

  /**
   * Remove the dialog, show any stacked dialogs.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  remove: function(dialog) {
    dialog = FB.Dialog._findRoot(dialog);
    if (dialog) {
      var is_active = FB.Dialog._active == dialog;
      FB.Dialog._removeStacked(dialog);
      if (is_active) {
        if (FB.Dialog._stack.length > 0) {
          FB.Dialog.show(FB.Dialog._stack.pop());
        } else {
          FB.Dialog._lowerActive();
        }
      }

      // wait before the actual removal because of race conditions with async
      // flash crap. seriously, dont ever ask me about it.
      // if we remove this without deferring, then in IE only, we'll get an
      // uncatchable error with no line numbers, function names, or stack
      // traces. the 3 second delay isn't a problem because the <div> is
      // already hidden, it's just not removed from the DOM yet.
      window.setTimeout(function() {
        dialog.parentNode.removeChild(dialog);
      }, 3000);
    }
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.event
 * @requires fb.prelude fb.array
 */

// NOTE: We tag this as FB.Event even though it is actually FB.EventProvider to
// work around limitations in the documentation system.
/**
 * Event handling mechanism for globally named events.
 *
 * @static
 * @class FB.Event
 */
FB.provide('EventProvider', {
  /**
   * Returns the internal subscriber array that can be directly manipulated by
   * adding/removing things.
   *
   * @access private
   * @return {Object}
   */
  subscribers: function() {
    // this odd looking logic is to allow instances to lazily have a map of
    // their events. if subscribers were an object literal itself, we would
    // have issues with instances sharing the subscribers when its being used
    // in a mixin style.
    if (!this._subscribersMap) {
      this._subscribersMap = {};
    }
    return this._subscribersMap;
  },

  /**
   * Subscribe to a given event name, invoking your callback function whenever
   * the event is fired.
   *
   * For example, suppose you want to get notified whenever the session
   * changes:
   *
   *     FB.Event.subscribe('auth.sessionChange', function(response) {
   *       // do something with response.session
   *     });
   *
   * Global Events:
   *
   * - auth.login -- fired when the user logs in
   * - auth.logout -- fired when the user logs out
   * - auth.sessionChange -- fired when the session changes
   * - auth.statusChange -- fired when the status changes
   * - xfbml.render -- fired when a call to FB.XFBML.parse() completes
   * - edge.create -- fired when the user likes something (fb:like)
   * - comments.add -- fired when the user adds a comment (fb:comments)
   * - fb.log -- fired on log message
   *
   * @access public
   * @param name {String} Name of the event.
   * @param cb {Function} The handler function.
   */
  subscribe: function(name, cb) {
    var subs = this.subscribers();

    if (!subs[name]) {
      subs[name] = [cb];
    } else {
      subs[name].push(cb);
    }
  },

  /**
   * Removes subscribers, inverse of [FB.Event.subscribe](FB.Event.subscribe).
   *
   * Removing a subscriber is basically the same as adding one. You need to
   * pass the same event name and function to unsubscribe that you passed into
   * subscribe. If we use a similar example to
   * [FB.Event.subscribe](FB.event.subscribe), we get:
   *
   *     var onSessionChange = function(response) {
   *       // do something with response.session
   *     };
   *     FB.Event.subscribe('auth.sessionChange', onSessionChange);
   *
   *     // sometime later in your code you dont want to get notified anymore
   *     FB.Event.unsubscribe('auth.sessionChange', onSessionChange);
   *
   * @access public
   * @param name {String} Name of the event.
   * @param cb {Function} The handler function.
   */
  unsubscribe: function(name, cb) {
    var subs = this.subscribers()[name];

    FB.Array.forEach(subs, function(value, key) {
      if (value == cb) {
        subs[key] = null;
      }
    });
  },

  /**
   * Repeatedly listen for an event over time. The callback is invoked
   * immediately when monitor is called, and then every time the event
   * fires. The subscription is canceled when the callback returns true.
   *
   * @access private
   * @param {string} name Name of event.
   * @param {function} callback A callback function. Any additional arguments
   * to monitor() will be passed on to the callback. When the callback returns
   * true, the monitoring will cease.
   */
  monitor: function(name, callback) {
    if (!callback()) {
      var
        ctx = this,
        fn = function() {
          if (callback.apply(callback, arguments)) {
            ctx.unsubscribe(name, fn);
          }
        };

      this.subscribe(name, fn);
    }
  },

  /**
   * Removes all subscribers for named event.
   *
   * You need to pass the same event name that was passed to FB.Event.subscribe.
   * This is useful if the event is no longer worth listening to and you
   * believe that multiple subscribers have been set up.
   *
   * @access private
   * @param name    {String}   name of the event
   */
  clear: function(name) {
    delete this.subscribers()[name];
  },

  /**
   * Fires a named event. The first argument is the name, the rest of the
   * arguments are passed to the subscribers.
   *
   * @access private
   * @param name {String} the event name
   */
  fire: function() {
    var
      args = Array.prototype.slice.call(arguments),
      name = args.shift();

    FB.Array.forEach(this.subscribers()[name], function(sub) {
      // this is because we sometimes null out unsubscribed rather than jiggle
      // the array
      if (sub) {
        sub.apply(this, args);
      }
    });
  }
});

/**
 * Event handling mechanism for globally named events.
 *
 * @class FB.Event
 * @extends FB.EventProvider
 */
FB.provide('Event', FB.EventProvider);
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.flash
 * @requires fb.prelude
 *           fb.qs
 *           fb.content
 */

/**
 * Flash Support.
 *
 * @class FB.Flash
 * @static
 * @access private
 */
FB.provide('Flash', {
  //
  // DYNAMIC DATA
  //
  _minVersions: [
    [9,  0, 159, 0 ],
    [10, 0, 22,  87]
  ],
  _swfPath: 'swf/XdComm.swf',

  /**
   * The onReady callbacks.
   *
   * @access private
   * @type Array
   */
  _callbacks: [],

  /**
   * Initialize the SWF.
   *
   * @access private
   */
  init: function() {
    // only initialize once
    if (FB.Flash._init) {
      return;
    }
    FB.Flash._init = true;

    // the SWF calls this global function to notify that its ready
    // FIXME: should allow the SWF to take a flashvar that controls the name
    // of this function. we should not have any globals other than FB.
    window.FB_OnFlashXdCommReady = function() {
      FB.Flash._ready = true;
      for (var i=0, l=FB.Flash._callbacks.length; i<l; i++) {
        FB.Flash._callbacks[i]();
      }
      FB.Flash._callbacks = [];
    };

    // create the swf
    var
      IE   = !!document.attachEvent,
      swf  = FB._domain.cdn + FB.Flash._swfPath,
      html = (
        '<object ' +
          'type="application/x-shockwave-flash" ' +
          'id="XdComm" ' +
          (IE ? 'name="XdComm" ' : '') +
          (IE ? '' : 'data="' + swf + '" ') +
          (IE
              ? 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" '
              : ''
          ) +
          'allowscriptaccess="always">' +
          '<param name="movie" value="' + swf + '"></param>' +
          '<param name="allowscriptaccess" value="always"></param>' +
        '</object>'
      );

    FB.Content.appendHidden(html);
  },

  /**
   * Check that the minimal version of Flash we need is available.
   *
   * @access private
   * @return {Boolean} true if the minimum version requirements are matched
   */
  hasMinVersion: function() {
    if (typeof FB.Flash._hasMinVersion === 'undefined') {
      var
        versionString,
        i,
        l,
        version = [];
      try {
        versionString = new ActiveXObject('ShockwaveFlash.ShockwaveFlash')
                          .GetVariable('$version');
      } catch(x) {
        if (navigator.mimeTypes.length > 0) {
          var mimeType = 'application/x-shockwave-flash';
          if (navigator.mimeTypes[mimeType].enabledPlugin) {
            var name = 'Shockwave Flash';
            versionString = (navigator.plugins[name + ' 2.0'] ||
                             navigator.plugins[name])
                            .description;
          }
        }
      }

      // take the string and come up with an array of integers:
      //   [10, 0, 22]
      if (versionString) {
        var parts = versionString
                      .replace(/\D+/g, ',')
                      .match(/^,?(.+),?$/)[1]
                      .split(',');
        for (i=0, l=parts.length; i<l; i++) {
          version.push(parseInt(parts[i], 10));
        }
      }

      // start by assuming we dont have the min version.
      FB.Flash._hasMinVersion = false;

      // look through all the allowed version definitions.
      majorVersion:
      for (i=0, l=FB.Flash._minVersions.length; i<l; i++) {
        var spec = FB.Flash._minVersions[i];

        // we only accept known major versions, and every supported major
        // version has at least one entry in _minVersions. only if the major
        // version matches, does the rest of the check make sense.
        if (spec[0] != version[0]) {
          continue;
        }

        // the rest of the version components must be equal or higher
        for (var m=1, n=spec.length, o=version.length; (m<n && m<o); m++) {
          if (version[m] < spec[m]) {
            // less means this major version is no good
//#JSCOVERAGE_IF 0
            FB.Flash._hasMinVersion = false;
            continue majorVersion;
//#JSCOVERAGE_ENDIF
          } else {
            FB.Flash._hasMinVersion = true;
            if (version[m] > spec[m]) {
              // better than needed
              break majorVersion;
            }
          }
        }
      }
    }

    return FB.Flash._hasMinVersion;
  },

  /**
   * Register a function that needs to ensure Flash is ready.
   *
   * @access private
   * @param cb {Function} the function
   */
  onReady: function(cb) {
    FB.Flash.init();
    if (FB.Flash._ready) {
      // this forces the cb to be asynchronous to ensure no one relies on the
      // _potential_ synchronous nature.
      window.setTimeout(cb, 0);
    } else {
      FB.Flash._callbacks.push(cb);
    }
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * JavaScript library providing Facebook Connect integration.
 *
 * @provides fb.init
 * @requires fb.prelude
 *           fb.auth
 *           fb.api
 *           fb.cookie
 *           fb.ui
 *           fb.xd
 */

/**
 * This is the top level for all the public APIs.
 *
 * @class FB
 * @static
 * @access public
 */
FB.provide('', {
  /**
   * Initialize the library.
   *
   * Typical initialization enabling all optional features:
   *
   *      <div id="fb-root"></div>
   *      <script src="http://connect.facebook.net/en_US/all.js"></script>
   *      <script>
   *        FB.init({
   *          appId  : 'YOUR APP ID',
   *          status : true, // check login status
   *          cookie : true, // enable cookies to allow the server to access the session
   *          xfbml  : true  // parse XFBML
   *        });
   *      </script>
   *
   * The best place to put this code is right before the closing
   * `</body>` tag.
   *
   * ### Asynchronous Loading
   *
   * The library makes non-blocking loading of the script easy to use by
   * providing the `fbAsyncInit` hook. If this global function is defined, it
   * will be executed when the library is loaded:
   *
   *     <div id="fb-root"></div>
   *     <script>
   *       window.fbAsyncInit = function() {
   *         FB.init({
   *           appId  : 'YOUR APP ID',
   *           status : true, // check login status
   *           cookie : true, // enable cookies to allow the server to access the session
   *           xfbml  : true  // parse XFBML
   *         });
   *       };
   *
   *       (function() {
   *         var e = document.createElement('script');
   *         e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
   *         e.async = true;
   *         document.getElementById('fb-root').appendChild(e);
   *       }());
   *     </script>
   *
   * The best place to put the asynchronous version of the code is right after
   * the opening `<body>` tag. This allows Facebook initialization to happen in
   * parallel with the initialization on the rest of your page.
   *
   * ### Internationalization
   *
   * Facebook Connect features are available many locales. You can replace the
   * `en_US` locale specifed above with one of the [supported Facebook
   * Locales][locales]. For example, to load up the library and trigger dialogs,
   * popups and plugins to be in Hindi (`hi_IN`), you can load the library from
   * this URL:
   *
   *     http://connect.facebook.net/hi_IN/all.js
   *
   * [locales]: http://wiki.developers.facebook.com/index.php/Facebook_Locales
   *
   * ### SSL
   *
   * Facebook Connect is also available over SSL. You should only use this when
   * your own page is served over `https://`. The library will rely on the
   * current page protocol at runtime. The SSL URL is the same, only the
   * protocol is changed:
   *
   *     https://connect.facebook.net/en_US/all.js
   *
   * **Note**: Some [UI methods][FB.ui] like **stream.publish** and
   * **stream.share** can be used without registering an application or calling
   * this method. If you are using an appId, all methods **must** be called
   * after this method.
   *
   * [FB.ui]: /docs/reference/javascript/FB.ui
   *
   * @access public
   * @param options {Object}
   *
   * Property | Type    | Description                          | Argument   | Default
   * -------- | ------- | ------------------------------------ | ---------- | -------
   * appId    | String  | Your application ID.                 | *Optional* | `null`
   * cookie   | Boolean | `true` to enable cookie support.     | *Optional* | `false`
   * logging  | Boolean | `false` to disable logging.          | *Optional* | `true`
   * session  | Object  | Use specified session object.        | *Optional* | `null`
   * status   | Boolean | `true` to fetch fresh status.        | *Optional* | `false`
   * xfbml    | Boolean | `true` to parse [[wiki:XFBML]] tags. | *Optional* | `false`
   */
  init: function(options) {
    // only need to list values here that do not already have a falsy default.
    // this is why cookie/session/status are not listed here.
    options = FB.copy(options || {}, {
      logging: true
    });

    FB._apiKey = options.appId || options.apiKey;

    // disable logging if told to do so, but only if the url doesnt have the
    // token to turn it on. this allows for easier debugging of third party
    // sites even if logging has been turned off.
    if (!options.logging &&
        window.location.toString().indexOf('fb_debug=1') < 0) {
      FB._logging = false;
    }

    FB.XD.init(options.channelUrl);

    if (FB._apiKey) {
      // enable cookie support if told to do so
      FB.Cookie.setEnabled(options.cookie);

      // if an explicit session was not given, try to _read_ an existing cookie.
      // we dont enable writing automatically, but we do read automatically.
      options.session = options.session || FB.Cookie.load();

      // set the session
      FB.Auth.setSession(options.session,
                         options.session ? 'connected' : 'unknown');

      // load a fresh session if requested
      if (options.status) {
        FB.getLoginStatus();
      }
    }

    // weak dependency on XFBML
    if (options.xfbml) {
      // do this in a setTimeout to delay it until the current call stack has
      // finished executing
      window.setTimeout(function() {
        if (FB.XFBML) {
          FB.Dom.ready(FB.XFBML.parse);
        }
      }, 0);
    }
  }
});

// this is useful when the library is being loaded asynchronously
//
// we do it in a setTimeout to wait until the current event loop as finished.
// this allows potential library code being included below this block (possible
// when being served from an automatically combined version)
window.setTimeout(function() { if (window.fbAsyncInit) { fbAsyncInit(); }}, 0);
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * Contains the public method ``FB.Insights.impression`` for analytics pixel
 *
 * @provides fb.insights
 * @requires fb.prelude
 */

/**
 * Analytics pixel calls. If you are unsure about the potential that
 * integrating Facebook could provide your application, you can use this light
 * weight image beacon to collect some insights.
 *
 * TODO: Where does one go to look at this data?
 *
 * @class FB.Insights
 * @static
 * @access private
 */
FB.provide('Insights', {
  /**
   * This method should be called once by each page where you want to track
   * impressions.
   *
   *     FB.Insights.impression(
   *       {
   *         api_key: 'API_KEY',
   *         lid: 'EVENT_TYPE'
   *       }
   *     );
   *
   * @access private
   * @param params {Object} parameters for the impression
   * @param cb {Function} optional - called with the result of the action
   */
  impression: function(params, cb) {
    // no http or https so browser will use protocol of current page
    // see http://www.faqs.org/rfcs/rfc1808.html
    var g = FB.guid(),
        u = "//ah8.facebook.com/impression.php/" + g + "/",
        i = new Image(1, 1),
        s = [];

    if (!params.api_key && FB._apiKey) {
      params.api_key = FB._apiKey;
    }
    for (var k in params) {
      s.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    }

    u += '?' + s.join('&');
    if (cb) {
      i.onload = cb;
    }
    i.src = u;
  }
});

/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.intl
 * @requires fb.prelude
 */

/**
 * Provides i18n machinery.
 *
 * @class FB.Intl
 * @static
 * @access private
 */
FB.provide('Intl', {
  /**
   * Regular expression snippet containing all the characters that we
   * count as sentence-final punctuation.
   */
  _punctCharClass: (
    '[' +
      '.!?' +
      '\u3002' +  // Chinese/Japanese period
      '\uFF01' +  // Fullwidth exclamation point
      '\uFF1F' +  // Fullwidth question mark
      '\u0964' +  // Hindi "full stop"
      '\u2026' +  // Chinese ellipsis
      '\u0EAF' +  // Laotian ellipsis
      '\u1801' +  // Mongolian ellipsis
      '\u0E2F' +  // Thai ellipsis
      '\uFF0E' +  // Fullwidth full stop
    ']'
  ),

  /**
   * Checks whether a string ends in sentence-final punctuation. This logic is
   * about the same as the PHP ends_in_punct() function; it takes into account
   * the fact that we consider a string like "foo." to end with a period even
   * though there's a quote mark afterward.
   */
  _endsInPunct: function(str) {
    if (typeof str != 'string') {
      return false;
    }

    return str.match(new RegExp(
      FB.Intl._punctCharClass +
      '[' +
        ')"' +
        "'" +
        // JavaScript doesn't support Unicode character
        // properties in regexes, so we have to list
        // all of these individually. This is an
        // abbreviated list of the "final punctuation"
        // and "close punctuation" Unicode codepoints,
        // excluding symbols we're unlikely to ever
        // see (mathematical notation, etc.)
        '\u00BB' +  // Double angle quote
        '\u0F3B' +  // Tibetan close quote
        '\u0F3D' +  // Tibetan right paren
        '\u2019' +  // Right single quote
        '\u201D' +  // Right double quote
        '\u203A' +  // Single right angle quote
        '\u3009' +  // Right angle bracket
        '\u300B' +  // Right double angle bracket
        '\u300D' +  // Right corner bracket
        '\u300F' +  // Right hollow corner bracket
        '\u3011' +  // Right lenticular bracket
        '\u3015' +  // Right tortoise shell bracket
        '\u3017' +  // Right hollow lenticular bracket
        '\u3019' +  // Right hollow tortoise shell
        '\u301B' +  // Right hollow square bracket
        '\u301E' +  // Double prime quote
        '\u301F' +  // Low double prime quote
        '\uFD3F' +  // Ornate right parenthesis
        '\uFF07' +  // Fullwidth apostrophe
        '\uFF09' +  // Fullwidth right parenthesis
        '\uFF3D' +  // Fullwidth right square bracket
        '\s' +
      ']*$'
    ));
  },

  /**
   * i18n string formatting
   *
   * @param str {String} the string id
   * @param args {Object} the replacement tokens
   */
  _tx: function (str, args) {
    // Does the token substitution for tx() but without the string lookup.
    // Used for in-place substitutions in translation mode.
    if (args !== undefined) {
      if (typeof args != 'object') {
        FB.log(
          'The second arg to FB.Intl._tx() must be an Object for ' +
          'tx(' + str + ', ...)'
        );
      } else {
        var regexp;
        for (var key in args) {
          if (args.hasOwnProperty(key)) {
            // _tx("You are a {what}.", {what:'cow!'}) should be "You are a
            // cow!" rather than "You are a cow!."

            if (FB.Intl._endsInPunct(args[key])) {
              // Replace both the token and the sentence-final punctuation
              // after it, if any.
              regexp = new RegExp('\{' + key + '\}' +
                                    FB.Intl._punctCharClass + '*',
                                  'g');
            } else {
              regexp = new RegExp('\{' + key + '\}', 'g');
            }
            str = str.replace(regexp, args[key]);
          }
        }
      }
    }
    return str;
  },

  /**
   * i18n string formatting
   *
   * @access private
   * @param str {String} the string id
   * @param args {Object} the replacement tokens
   */
  tx: function (str, args) {
    // this is replaced by the i18n machinery when the resources are localized
    function tx(str, args) {
      void(0);
    }

    // Fail silently if the string table isn't defined. This behaviour is used
    // when a developer chooses the host the library themselves, rather than
    // using the one served from facebook.
    if (!FB.Intl._stringTable) {
      return null;
    }
    return FBIntern.Intl._tx(FB.Intl._stringTable[str], args);
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.json
 * @requires fb.prelude
 *           fb.thirdparty.json2
 */

/**
 * Simple wrapper around standard JSON to handle third-party library quirks.
 *
 * @class FB.JSON
 * @static
 * @access private
 */
FB.provide('JSON', {
  /**
   * Stringify an object.
   *
   * @param obj {Object} the input object
   * @return {String} the JSON string
   */
  stringify: function(obj) {
    // PrototypeJS is incompatible with native JSON or JSON2 (which is what
    // native JSON is based on)
    if (window.Prototype && Object.toJSON) {
      return Object.toJSON(obj);
    } else {
      return JSON.stringify(obj);
    }
  },

  /**
   * Parse a JSON string.
   *
   * @param str {String} the JSON string
   * @param {Object} the parsed object
   */
  parse: function(str) {
    return JSON.parse(str);
  },

  /**
   * Flatten an object to "stringified" values only. This is useful as a
   * pre-processing query strings where the server expects query parameter
   * values to be JSON encoded.
   *
   * @param obj {Object} the input object
   * @return {Object} object with only string values
   */
  flatten: function(obj) {
    var flat = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = obj[key];
        if (null === value || undefined === value) {
          continue;
        } else if (typeof value == 'string') {
          flat[key] = value;
        } else {
          flat[key] = FB.JSON.stringify(value);
        }
      }
    }
    return flat;
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.qs
 * @requires fb.prelude fb.array
 */

/**
 * Query String encoding & decoding.
 *
 * @class FB.QS
 * @static
 * @access private
 */
FB.provide('QS', {
  /**
   * Encode parameters to a query string.
   *
   * @access private
   * @param   params {Object}  the parameters to encode
   * @param   sep    {String}  the separator string (defaults to '&')
   * @param   encode {Boolean} indicate if the key/value should be URI encoded
   * @return        {String}  the query string
   */
  encode: function(params, sep, encode) {
    sep    = sep === undefined ? '&' : sep;
    encode = encode === false ? function(s) { return s; } : encodeURIComponent;

    var pairs = [];
    FB.Array.forEach(params, function(val, key) {
      if (val !== null && typeof val != 'undefined') {
        pairs.push(encode(key) + '=' + encode(val));
      }
    });
    pairs.sort();
    return pairs.join(sep);
  },

  /**
   * Decode a query string into a parameters object.
   *
   * @access private
   * @param   str {String} the query string
   * @return     {Object} the parameters to encode
   */
  decode: function(str) {
    var
      decode = decodeURIComponent,
      params = {},
      parts  = str.split('&'),
      i,
      pair;

    for (i=0; i<parts.length; i++) {
      pair = parts[i].split('=', 2);
      if (pair && pair[0]) {
        params[decode(pair[0])] = decode(pair[1]);
      }
    }

    return params;
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.ui
 * @requires fb.prelude
 *           fb.content
 *           fb.dialog
 *           fb.qs
 *           fb.json
 *           fb.xd
 */

/**
 * UI Calls.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Method for triggering UI interaction with Facebook as iframe dialogs or
   * popups, like publishing to the stream, sharing links.
   *
   * Example **stream.publish**:
   *
   *      FB.ui(
   *        {
   *          method: 'stream.publish',
   *          message: 'getting educated about Facebook Connect',
   *          attachment: {
   *            name: 'Connect',
   *            caption: 'The Facebook Connect JavaScript SDK',
   *            description: (
   *              'A small JavaScript library that allows you to harness ' +
   *              'the power of Facebook, bringing the user\'s identity, ' +
   *              'social graph and distribution power to your site.'
   *            ),
   *            href: 'http://github.com/facebook/connect-js'
   *          },
   *          action_links: [
   *            { text: 'Code', href: 'http://github.com/facebook/connect-js' }
   *          ],
   *          user_message_prompt: 'Share your thoughts about Connect'
   *        },
   *        function(response) {
   *          if (response && response.post_id) {
   *            alert('Post was published.');
   *          } else {
   *            alert('Post was not published.');
   *          }
   *        }
   *      );
   *
   * Example **stream.share**:
   *
   *      var share = {
   *        method: 'stream.share',
   *        u: 'http://fbrell.com/'
   *      };
   *
   *      FB.ui(share, function(response) { console.log(response); });
   *
   * @access public
   * @param params {Object} The required arguments vary based on the method
   * being used, but specifying the method itself is mandatory. If *display* is
   * not specified, then iframe dialogs will be used when possible, and popups
   * otherwise.
   *
   * Property | Type    | Description                        | Argument
   * -------- | ------- | ---------------------------------- | ------------
   * method   | String  | The UI dialog to invoke.           | **Required**
   * display  | String  | Specify `"popup"` to force popups. | **Optional**
   * @param cb {Function} Optional callback function to handle the result. Not
   * all methods may have a response.
   */
  ui: function(params, cb) {
    if (!params.method) {
      FB.log('"method" is a required parameter for FB.ui().');
      return;
    }

    var call = FB.UIServer.prepareCall(params, cb);
    if (!call) { // aborted
      return;
    }

    // each allowed "display" value maps to a function
    var displayName = call.params.display;
    if (displayName == 'dialog') { // TODO remove once all dialogs are on
                                   // uiserver
      displayName = 'iframe';
    }
    var displayFn = FB.UIServer[displayName];
    if (!displayFn) {
      FB.log('"display" must be one of "popup", "iframe" or "hidden".');
      return;
    }

    displayFn(call);
  }
});

/**
 * Internal UI functions.
 *
 * @class FB.UIServer
 * @static
 * @access private
 */
FB.provide('UIServer', {
  /**
   * UI Methods will be defined in this namespace.
   */
  Methods: {},

  _active        : {},
  _defaultCb     : {},
  _resultToken   : '"xxRESULTTOKENxx"',

  /**
   * Serves as a generic transform for UI Server dialogs. Once all dialogs are
   * built on UI Server, this will just become the default behavior.
   *
   * Current transforms:
   * 1) display=dialog -> display=iframe. Most of the old Connect stuff uses
   *    dialog, but UI Server uses iframe.
   * 2) Renaming of channel_url parameter to channel.
   */
  genericTransform: function(call) {
    if (call.params.display == 'dialog') {
      call.params.display = 'iframe';
      call.params.channel = FB.UIServer._xdChannelHandler(
        call.id,
        'parent.parent'
      );
    }
    return call;
  },

  /**
   * Prepares a generic UI call.
   *
   * @access private
   * @param params {Object} the user supplied parameters
   * @param cb {Function} the response callback
   * @returns {Object} the call data
   */
  prepareCall: function(params, cb) {
    var
      method = FB.UIServer.Methods[params.method.toLowerCase()],
      id     = FB.guid();

    if (!method) {
      FB.log('"' + params.method.toLowerCase() + '" is an unknown method.');
      return;
    }

    // default stuff
    FB.copy(params, {
      api_key     : FB._apiKey,
      // TODO change "dialog" to "iframe" once moved to uiserver
      display     : FB._session ? 'dialog' : 'popup',
      locale      : FB._locale,
      sdk         : 'joey',
      session_key : FB._session && FB._session.session_key
    });

    // cannot use an iframe "dialog" if a session is not available
    if (!FB._session && params.display == 'dialog' && !method.loggedOutIframe) {
      FB.log('"dialog" mode can only be used when the user is connected.');
      params.display = 'popup';
    }

    // the basic call data
    var call = {
      cb     : cb,
      id     : id,
      size   : method.size || {},
      url    : FB._domain.www + method.url,
      params : params
    };

    // optional method transform
    if (method.transform) {
      call = method.transform(call);

      // nothing returned from a transform means we abort
      if (!call) {
        return;
      }
    }

    // setting these after to ensure the value is based on the final
    // params.display value
    var relation = call.params.display == 'popup' ? 'opener' : 'parent';
    if (!(call.id in FB.UIServer._defaultCb) && !('next' in call.params)) {
      call.params.next = FB.UIServer._xdResult(
        call.cb,
        call.id,
        relation,
        true // isDefault
      );
    }
    if (relation === 'parent') {
      call.params.channel_url = FB.UIServer._xdChannelHandler(
        id,
        'parent.parent'
      );
    }

    // set this at the end to include all possible params
    var encodedQS = FB.QS.encode(FB.JSON.flatten(call.params));
    if ((call.url + encodedQS).length > 2000) {
      call.post = true;
    } else {
      if (encodedQS) {
        call.url += '?' + encodedQS;
      }
    }

    return call;
  },

  /**
   * Open a popup window with the given url and dimensions and place it at the
   * center of the current window.
   *
   * @access private
   * @param call {Object} the call data
   */
  popup: function(call) {
    // we try to place it at the center of the current window
    var
      screenX    = typeof window.screenX      != 'undefined'
        ? window.screenX
        : window.screenLeft,
      screenY    = typeof window.screenY      != 'undefined'
        ? window.screenY
        : window.screenTop,
      outerWidth = typeof window.outerWidth   != 'undefined'
        ? window.outerWidth
        : document.documentElement.clientWidth,
      outerHeight = typeof window.outerHeight != 'undefined'
        ? window.outerHeight
        : (document.documentElement.clientHeight - 22), // 22= IE toolbar height
      width    = call.size.width,
      height   = call.size.height,
      left     = parseInt(screenX + ((outerWidth - width) / 2), 10),
      top      = parseInt(screenY + ((outerHeight - height) / 2.5), 10),
      features = (
        'width=' + width +
        ',height=' + height +
        ',left=' + left +
        ',top=' + top
      );

    // either a empty window and then a POST, or a direct GET to the full url
    if (call.post) {
      FB.UIServer._active[call.id] = window.open(
        'about:blank',
        call.id,
        features
      );
      FB.Content.postTarget({
        url    : call.url,
        target : call.id,
        params : call.params
      });
    } else {
      FB.UIServer._active[call.id] = window.open(
        call.url,
        call.id,
        features
      );
    }

    // if there's a default close action, setup the monitor for it
    if (call.id in FB.UIServer._defaultCb) {
      FB.UIServer._popupMonitor();
    }
  },

  /**
   * Builds and inserts a hidden iframe based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  hidden: function(call) {
    call.className = 'FB_UI_Hidden';
    call.root = FB.Content.appendHidden('');
    FB.UIServer._insertIframe(call);
  },

  /**
   * Builds and inserts a iframe dialog based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  iframe: function(call) {
    call.className = 'FB_UI_Dialog';
    call.root = FB.Dialog.create({
      onClose: function() {
        FB.UIServer._triggerDefault(call.id);
      },
      loader: true,
      closeIcon: true
    });
    FB.Dom.addCss(call.root, 'fb_dialog_iframe');
    FB.UIServer._insertIframe(call);
  },

  /**
   * Inserts an iframe based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  _insertIframe: function(call) {
    // either a empty iframe and then a POST, or a direct GET to the full url
    if (call.post) {
      FB.Content.insertIframe({
        url       : 'about:blank',
        root      : call.root,
        className : call.className,
        width     : call.size.width,
        height    : call.size.height,
        onload    : function(node) {
          FB.UIServer._active[call.id] = node;
          FB.Content.postTarget({
            url    : call.url,
            target : node.name,
            params : call.params
          });
        }
      });
    } else {
      FB.Content.insertIframe({
        url       : call.url,
        root      : call.root,
        className : call.className,
        width     : call.size.width,
        height    : call.size.height,
        onload    : function(node) {
          FB.UIServer._active[call.id] = node;
        }
      });
    }
  },

  /**
   * Trigger the default action for the given call id.
   *
   * @param id {String} the call id
   */
  _triggerDefault: function(id) {
    FB.UIServer._xdRecv(
      { frame: id },
      FB.UIServer._defaultCb[id] || function() {}
    );
  },

  /**
   * Start and manage the window monitor interval. This allows us to invoke
   * the default callback for a window when the user closes the window
   * directly.
   *
   * @access private
   */
  _popupMonitor: function() {
    // check all open windows
    var found;
    for (var id in FB.UIServer._active) {
      // ignore prototype properties, and ones without a default callback
      if (FB.UIServer._active.hasOwnProperty(id) &&
          id in FB.UIServer._defaultCb) {
        var win = FB.UIServer._active[id];

        // ignore iframes
        try {
          if (win.tagName) {
            // is an iframe, we're done
            continue;
          }
        } catch (x) {
          // probably a permission error
        }

        try {
          // found a closed window
          if (win.closed) {
            FB.UIServer._triggerDefault(id);
          } else {
            found = true; // need to monitor this open window
          }
        } catch (y) {
          // probably a permission error
        }
      }
    }

    if (found && !FB.UIServer._popupInterval) {
      // start the monitor if needed and it's not already running
      FB.UIServer._popupInterval = window.setInterval(
        FB.UIServer._popupMonitor,
        100
      );
    } else if (!found && FB.UIServer._popupInterval) {
      // shutdown if we have nothing to monitor but it's running
      window.clearInterval(FB.UIServer._popupInterval);
      FB.UIServer._popupInterval = null;
    }
  },

  /**
   * Handles channel messages. These should be general, like a resize message.
   * Custom logic should be handled as part of the "next" handler.
   *
   * @access private
   * @param frame {String} the frame id
   * @param relation {String} the frame relation
   * @return {String} the handler url
   */
  _xdChannelHandler: function(frame, relation) {
    return FB.XD.handler(function(data) {
      var node = FB.UIServer._active[frame];
      if (!node) { // dead handler
        return;
      }
      if (data.type == 'resize') {
        if (data.height) {
          node.style.height = data.height + 'px';
        }
        if (data.width) {
          node.style.width = data.width + 'px';
        }
        FB.Dialog.show(node);
      }
    }, relation, true);
  },

  /**
   * A "next handler" is a specialized XD handler that will also close the
   * frame. This can be a hidden iframe, iframe dialog or a popup window.
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   frame id for the callback will be used with
   * @param relation  {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @return         {String}   the xd url bound to the callback
   */
  _xdNextHandler: function(cb, frame, relation, isDefault) {
    if (isDefault) {
      FB.UIServer._defaultCb[frame] = cb;
    }

    return FB.XD.handler(function(data) {
      FB.UIServer._xdRecv(data, cb);
    }, relation) + '&frame=' + frame;
  },

  /**
   * Handles the parsed message, invokes the bound callback with the data and
   * removes the related window/frame. This is the asynchronous entry point for
   * when a message arrives.
   *
   * @access private
   * @param data {Object} the message parameters
   * @param cb {Function} the callback function
   */
  _xdRecv: function(data, cb) {
    var frame = FB.UIServer._active[data.frame];

    // iframe
    try {
      if (FB.Dom.containsCss(frame, 'FB_UI_Hidden')) {
        // wait before the actual removal because of race conditions with async
        // flash crap. seriously, dont ever ask me about it.
        window.setTimeout(function() {
          // remove iframe's parentNode to match what FB.UIServer.hidden() does
          frame.parentNode.parentNode.removeChild(frame.parentNode);
        }, 3000);
      } else if (FB.Dom.containsCss(frame, 'FB_UI_Dialog')) {
        FB.Dialog.remove(frame);
      }
    } catch (x) {
      // do nothing, permission error
    }

    // popup window
    try {
      if (frame.close) {
        frame.close();
        FB.UIServer._popupCount--;
      }
    } catch (y) {
      // do nothing, permission error
    }

    // cleanup and fire
    delete FB.UIServer._active[data.frame];
    delete FB.UIServer._defaultCb[data.frame];
    cb(data);
  },

  /**
   * Some Facebook redirect URLs use a special ``xxRESULTTOKENxx`` to return
   * custom values. This is a convenience function to wrap a callback that
   * expects this value back.
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   the frame id for the callback is tied to
   * @param target    {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @return          {String}   the xd url bound to the callback
   */
  _xdResult: function(cb, frame, target, isDefault) {
    return (
      FB.UIServer._xdNextHandler(function(params) {
        cb && cb(params.result &&
                 params.result != FB.UIServer._resultToken &&
                 JSON.parse(params.result));
      }, frame, target, isDefault) +
      '&result=' + encodeURIComponent(FB.UIServer._resultToken)
    );
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.ui.methods
 * @requires fb.prelude
 *           fb.ui
 */

/**
 * Simple UI methods. Consider putting complex UI methods in their own modules.
 *
 * NOTE: Right now, Methods need to provide an initial size, as well as a URL.
 * In the UIServer enabled world, we should not need the URL.
 */
FB.provide('UIServer.Methods', {
  'friends.add': {
    size      : { width: 575, height: 240 },
    url       : 'connect/uiserver.php',
    transform : FB.UIServer.genericTransform
  },

  'stream.publish': {
    size : { width: 575, height: 240 },
    url  : 'connect/prompt_feed.php',
    transform: function(call) {
      var cb = call.cb;
      call.cb = function(result) {
        if (result) {
          if (result.postId) {
            result = { post_id: result.postId };
          } else {
            result = null;
          }
        }
        cb && cb(result);
      };

      call.params.callback = FB.UIServer._xdResult(
        call.cb,
        call.id,
        call.params.display == 'popup' ? 'opener' : 'parent',
        true
      );
      return call;
    }
  },

  'stream.share': {
    size      : { width: 575, height: 380 },
    url       : 'sharer.php',
    transform : function(call) {
      if (!call.params.u) {
        call.params.u = window.location.toString();
      }
      return call;
    }
  },

  'fbml.dialog': {
    size            : { width: 575, height: 300 },
    url             : 'render_fbml.php',
    loggedOutIframe : true
  },

  'bookmark.add': {
    size      : { width: 460, height: 226 },
    url       : 'connect/uiserver.php',
    transform : FB.UIServer.genericTransform
  },

  'profile.addtab': {
    size      : { width: 460, height: 226 },
    url       : 'connect/uiserver.php',
    transform : FB.UIServer.genericTransform
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.xd
 * @requires fb.prelude
 *           fb.qs
 *           fb.flash
 */

/**
 * The cross domain communication layer.
 *
 * @class FB.XD
 * @static
 * @access private
 */
FB.provide('XD', {
  _origin    : null,
  _transport : null,
  _callbacks : {},
  _forever   : {},

  /**
   * Initialize the XD layer. Native postMessage or Flash is required.
   *
   * @param channelUrl {String} optional channel URL
   * @access private
   */
  init: function(channelUrl) {
    // only do init once, if this is set, we're already done
    if (FB.XD._origin) {
      return;
    }

    // We currently disable postMessage in IE8 because it does not work with
    // window.opener. We can probably be smarter about it.
//#JSCOVERAGE_IF
    if (window.addEventListener && window.postMessage) {
      // The origin here is used for postMessage security. It needs to be based
      // on the URL of the current window. It is required and validated by
      // Facebook as part of the xd_proxy.php.
      FB.XD._origin = (window.location.protocol + '//' +
                       window.location.host + '/' + FB.guid());
      FB.XD.PostMessage.init();
      FB.XD._transport = 'postmessage';
    } else if (!channelUrl && FB.Flash.hasMinVersion()) {
      // The origin here is used for Flash XD security. It needs to be based on
      // document.domain rather than the URL of the current window. It is
      // required and validated by Facebook as part of the xd_proxy.php.
      FB.XD._origin = (window.location.protocol + '//' + document.domain +
                       '/' + FB.guid());
      FB.XD.Flash.init();
      FB.XD._transport = 'flash';
    } else {
      FB.XD._transport = 'fragment';
      FB.XD.Fragment._channelUrl = channelUrl || window.location.toString();
    }
  },

  /**
   * Resolve a id back to a node. An id is a string like:
   *   top.frames[5].frames['crazy'].parent.frames["two"].opener
   *
   * @param   id {String}   the string to resolve
   * @returns    {Node}     the resolved window object
   * @throws  SyntaxError   if the id is malformed
   */
  resolveRelation: function(id) {
    var
      pt,
      matches,
      parts = id.split('.'),
      node = window;

    for (var i=0, l=parts.length; i<l; i++) {
      pt = parts[i];

      if (pt === 'opener' || pt === 'parent' || pt === 'top') {
        node = node[pt];
      } else if (matches = /^frames\[['"]?([a-zA-Z0-9-_]+)['"]?\]$/.exec(pt)) {
        // these regex has the `feature' of fixing some badly quoted strings
        node = node.frames[matches[1]];
      } else {
        throw new SyntaxError('Malformed id to resolve: ' + id + ', pt: ' + pt);
      }
    }

    return node;
  },

  /**
   * Builds a url attached to a callback for xd messages.
   *
   * This is one half of the XD layer. Given a callback function, we generate
   * a xd URL which will invoke the function. This allows us to generate
   * redirect urls (used for next/cancel and so on) which will invoke our
   * callback functions.
   *
   * @access private
   * @param cb       {Function} the callback function
   * @param relation {String}   parent or opener to indicate window relation
   * @param forever  {Boolean}  indicate this handler needs to live forever
   * @return        {String}   the xd url bound to the callback
   */
  handler: function(cb, relation, forever) {
    // if for some reason, we end up trying to create a handler on a page that
    // is already being used for XD comm as part of the fragment, we simply
    // return 'javascript:false' to prevent a recursive page load loop
    //
    // the // after it makes any appended things to the url become a JS
    // comment, and prevents JS parse errors. cloWntoWn.
    if (window.location.toString().indexOf(FB.XD.Fragment._magic) > 0) {
      return 'javascript:false;//';
    }

    // the ?=& tricks login.php into appending at the end instead
    // of before the fragment as a query string
    // FIXME
    var
      xdProxy = FB._domain.cdn + 'connect/xd_proxy.php#?=&',
      id = FB.guid();

    // in fragment mode, the url is the current page and a fragment with a
    // magic token
    if (FB.XD._transport == 'fragment') {
      xdProxy = FB.XD.Fragment._channelUrl;
      var poundIndex = xdProxy.indexOf('#');
      if (poundIndex > 0) {
        xdProxy = xdProxy.substr(0, poundIndex);
      }
      xdProxy += (
        (xdProxy.indexOf('?') < 0 ? '?' : '&') +
        FB.XD.Fragment._magic + '#?=&'
      );
    }

    if (forever) {
      FB.XD._forever[id] = true;
    }

    FB.XD._callbacks[id] = cb;
    return xdProxy + FB.QS.encode({
      cb        : id,
      origin    : FB.XD._origin,
      relation  : relation || 'opener',
      transport : FB.XD._transport
    });
  },

  /**
   * Handles the raw or parsed message and invokes the bound callback with
   * the data and removes the related window/frame.
   *
   * @access private
   * @param data {String|Object} the message fragment string or parameters
   */
  recv: function(data) {
    if (typeof data == 'string') {
      data = FB.QS.decode(data);
    }

    var cb = FB.XD._callbacks[data.cb];
    if (!FB.XD._forever[data.cb]) {
      delete FB.XD._callbacks[data.cb];
    }
    cb && cb(data);
  },

  /**
   * Provides Native ``window.postMessage`` based XD support.
   *
   * @class FB.XD.PostMessage
   * @static
   * @for FB.XD
   * @access private
   */
  PostMessage: {
    /**
     * Initialize the native PostMessage system.
     *
     * @access private
     */
    init: function() {
      var H = FB.XD.PostMessage.onMessage;
      window.addEventListener
        ? window.addEventListener('message', H, false)
        : window.attachEvent('onmessage', H);
    },

    /**
     * Handles a message event.
     *
     * @access private
     * @param event {Event} the event object
     */
    onMessage: function(event) {
      FB.XD.recv(event.data);
    }
  },

  /**
   * Provides Flash Local Connection based XD support.
   *
   * @class FB.XD.Flash
   * @static
   * @for FB.XD
   * @access private
   */
  Flash: {
    /**
     * Initialize the Flash Local Connection.
     *
     * @access private
     */
    init: function() {
      FB.Flash.onReady(function() {
        document.XdComm.postMessage_init('FB.XD.Flash.onMessage',
                                         FB.XD._origin);
      });
    },

    /**
     * Handles a message received by the Flash Local Connection.
     *
     * @access private
     * @param message {String} the URI encoded string sent by the SWF
     */
    onMessage: function(message) {
      FB.XD.recv(decodeURIComponent(message));
    }
  },

  /**
   * Provides XD support via a fragment by reusing the current page.
   *
   * @class FB.XD.Fragment
   * @static
   * @for FB.XD
   * @access private
   */
  Fragment: {
    _magic: 'fb_xd_fragment',

    /**
     * Check if the fragment looks like a message, and dispatch if it does.
     */
    checkAndDispatch: function() {
      var
        loc = window.location.toString(),
        fragment = loc.substr(loc.indexOf('#') + 1),
        magicIndex = loc.indexOf(FB.XD.Fragment._magic);

      if (magicIndex > 0) {
        // make these no-op to help with performance
        //
        // this works independent of the module being present or not, or being
        // loaded before or after
        FB.init = FB.getLoginStatus = FB.api = function() {};

        // display none helps prevent loading of some stuff
        document.documentElement.style.display = 'none';

        FB.XD.resolveRelation(
          FB.QS.decode(fragment).relation).FB.XD.recv(fragment);
      }
    }
  }
});

// NOTE: self executing code.
//
// if the page is being used for fragment based XD messaging, we need to
// dispatch on load without needing any API calls. it only does stuff if the
// magic token is found in the fragment.
FB.XD.Fragment.checkAndDispatch();
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.compat.ui
 * @requires fb.prelude
 *           fb.qs
 *           fb.ui
 *           fb.json
 */

/**
 * NOTE: You should use FB.ui() instead.
 *
 * UI Calls.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * NOTE: You should use FB.ui() instead.
   *
   * Sharing is the light weight way of distributing your content. As opposed
   * to the structured data explicitly given in the [FB.publish][publish] call,
   * with share you simply provide the URL.
   *
   *      FB.share('http://github.com/facebook/connect-js');
   *
   * Calling [FB.share][share] without any arguments will share the current
   * page.
   *
   * This call can be used without requiring the user to sign in.
   *
   * [publish]: /docs/?u=facebook.jslib-alpha.FB.publish
   * [share]: /docs/?u=facebook.jslib-alpha.FB.share
   *
   * @access private
   * @param u {String} the url (defaults to current URL)
   */
  share: function(u) {
    FB.log('FB.share() has been deprecated. Please use FB.ui() instead.');
    FB.ui({
      display : 'popup',
      method  : 'stream.share',
      u       : u
    });
  },

  /**
   * NOTE: You should use FB.ui() instead.
   *
   * Publish a post to the stream.
   *
   * This is the main, fully featured distribution mechanism for you
   * to publish into the user's stream. It can be used, with or
   * without an API key. With an API key you can control the
   * Application Icon and get attribution. You must also do this if
   * you wish to use the callback to get notified of the `post_id`
   * and the `message` the user typed in the published post, or find
   * out if the user did not publish (clicked on the skipped button).
   *
   * Publishing is a powerful feature that allows you to submit rich
   * media and provide a integrated experience with control over your
   * stream post. You can guide the user by choosing the prompt,
   * and/or a default message which they may customize. In addition,
   * you may provide image, video, audio or flash based attachments
   * with along with their metadata. You also get the ability to
   * provide action links which show next to the "Like" and "Comment"
   * actions. All this together provides you full control over your
   * stream post. In addition, if you may also specify a target for
   * the story, such as another user or a page.
   *
   * A post may contain the following properties:
   *
   * Property            | Type   | Description
   * ------------------- | ------ | --------------------------------------
   * message             | String | This allows prepopulating the message.
   * attachment          | Object | An [[wiki:Attachment (Streams)]] object.
   * action_links        | Array  | An array of [[wiki:Action Links]].
   * actor_id            | String | A actor profile/page id.
   * target_id           | String | A target profile id.
   * user_message_prompt | String | Custom prompt message.
   *
   * The post and all the parameters are optional, so use what is best
   * for your specific case.
   *
   * Example:
   *
   *     var post = {
   *       message: 'getting educated about Facebook Connect',
   *       attachment: {
   *         name: 'Facebook Connect JavaScript SDK',
   *         description: (
   *           'A JavaScript library that allows you to harness ' +
   *           'the power of Facebook, bringing the user\'s identity, ' +
   *           'social graph and distribution power to your site.'
   *         ),
   *         href: 'http://github.com/facebook/connect-js'
   *       },
   *       action_links: [
   *         {
   *           text: 'GitHub Repo',
   *           href: 'http://github.com/facebook/connect-js'
   *         }
   *       ],
   *       user_message_prompt: 'Share your thoughts about Facebook Connect'
   *     };
   *
   *     FB.publish(
   *       post,
   *       function(published_post) {
   *         if (published_post) {
   *           alert(
   *             'The post was successfully published. ' +
   *             'Post ID: ' + published_post.post_id +
   *             '. Message: ' + published_post.message
   *           );
   *         } else {
   *           alert('The post was not published.');
   *         }
   *       }
   *     );
   *
   * @access private
   * @param post {Object} the post object
   * @param cb {Function} called with the result of the action
   */
  publish: function(post, cb) {
    FB.log('FB.publish() has been deprecated. Please use FB.ui() instead.');
    post = post || {};
    FB.ui(FB.copy({
      display : 'popup',
      method  : 'stream.publish',
      preview : 1
    }, post || {}), cb);
  },

  /**
   * NOTE: You should use FB.ui() instead.
   *
   * Prompt the user to add the given id as a friend.
   *
   * @access private
   * @param id {String} the id of the target user
   * @param cb {Function} called with the result of the action
   */
  addFriend: function(id, cb) {
    FB.log('FB.addFriend() has been deprecated. Please use FB.ui() instead.');
    FB.ui({
      display : 'popup',
      id      : id,
      method  : 'friend.add'
    }, cb);
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.array
 * @layer basic
 * @requires fb.prelude
 */

/**
 * Array related helper methods.
 *
 * @class FB.Array
 * @private
 * @static
 */
FB.provide('Array', {
  /**
   * Get index of item inside an array. Return's -1 if element is not found.
   *
   * @param arr {Array} Array to look through.
   * @param item {Object} Item to locate.
   * @return {Number} Index of item.
   */
  indexOf: function (arr, item) {
    if (arr.indexOf) {
      return arr.indexOf(item);
    }
    var length = arr.length;
    if (length) {
      for (var index = 0; index < length; index++) {
        if (arr[index] === item) {
          return index;
        }
      }
    }
    return -1;
  },

  /**
   * Merge items from source into target, but only if they dont exist. Returns
   * the target array back.
   *
   * @param target {Array} Target array.
   * @param source {Array} Source array.
   * @return {Array} Merged array.
   */
  merge: function(target, source) {
    for (var i=0; i < source.length; i++) {
      if (FB.Array.indexOf(target, source[i]) < 0) {
        target.push(source[i]);
      }
    }
    return target;
  },

  /**
   * Create an new array from the given array and a filter function.
   *
   * @param arr {Array} Source array.
   * @param fn {Function} Filter callback function.
   * @return {Array} Filtered array.
   */
  filter: function(arr, fn) {
    var b = [];
    for (var i=0; i < arr.length; i++) {
      if (fn(arr[i])) {
        b.push(arr[i]);
      }
    }
    return b;
  },

  /**
   * Create an array from the keys in an object.
   *
   * Example: keys({'x': 2, 'y': 3'}) returns ['x', 'y']
   *
   * @param obj {Object} Source object.
   * @param proto {Boolean} Specify true to include inherited properties.
   * @return {Array} The array of keys.
   */
  keys: function(obj, proto) {
    var arr = [];
    for (var key in obj) {
      if (proto || obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  },

  /**
   * Create an array by performing transformation on the items in a source
   * array.
   *
   * @param arr {Array} Source array.
   * @param transform {Function} Transformation function.
   * @return {Array} The transformed array.
   */
  map: function(arr, transform) {
    var ret = [];
    for (var i=0; i < arr.length; i++) {
      ret.push(transform(arr[i]));
    }
    return ret;
  },

  /**
   * For looping through Arrays and Objects.
   *
   * @param {Object} item   an Array or an Object
   * @param {Function} fn   the callback function for iteration.
   *    The function will be pass (value, [index/key], item) paramters
   * @param {Bool} proto  indicate if properties from the prototype should
   *                      be included
   *
   */
   forEach: function(item, fn, proto) {
    if (!item) {
      return;
    }

    if (Object.prototype.toString.apply(item) === '[object Array]' ||
        (!(item instanceof Function) && typeof item.length == 'number')) {
      if (item.forEach) {
        item.forEach(fn);
      } else {
        for (var i=0, l=item.length; i<l; i++) {
          fn(item[i], i, item);
        }
      }
    } else {
      for (var key in item) {
        if (proto || item.hasOwnProperty(key)) {
          fn(item[key], key, item);
        }
      }
    }
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.dom
 * @layer basic
 * @requires fb.prelude
 *           fb.event
 *           fb.string
 *           fb.array
 */

/**
 * This provides helper methods related to DOM.
 *
 * @class FB.Dom
 * @static
 * @private
 */
FB.provide('Dom', {
  /**
   * Check if the element contains a class name.
   *
   * @param dom {DOMElement} the element
   * @param className {String} the class name
   * @return {Boolean}
   */
  containsCss: function(dom, className) {
    var cssClassWithSpace = ' ' + dom.className + ' ';
    return cssClassWithSpace.indexOf(' ' + className + ' ') >= 0;
  },

  /**
   * Add a class to a element.
   *
   * @param dom {DOMElement} the element
   * @param className {String} the class name
   */
  addCss: function(dom, className) {
    if (!FB.Dom.containsCss(dom, className)) {
      dom.className = dom.className + ' ' + className;
    }
  },

  /**
   * Remove a class from the element.
   *
   * @param dom {DOMElement} the element
   * @param className {String} the class name
   */
  removeCss: function(dom, className) {
    if (FB.Dom.containsCss(dom, className)) {
      dom.className = dom.className.replace(className, '');
      FB.Dom.removeCss(dom, className); // in case of repetition
    }
  },

  /**
   * Returns the computed style for the element
   *
   * note: requires browser specific names to be passed for specials
   *       border-radius -> ('-moz-border-radius', 'border-radius')
   *
   * @param dom {DOMElement} the element
   * @param styleProp {String} the property name
   */
  getStyle: function (dom, styleProp) {
    var y = false, s = dom.style;
    if (styleProp == 'opacity') {
      if (s.opacity) { return s.opacity * 100; }
      if (s.MozOpacity) { return s.MozOpacity * 100; }
      if (s.KhtmlOpacity) { return s.KhtmlOpacity * 100; }
      if (s.filters) { return s.filters.alpha.opacity; }
      return 0; // TODO(alpjor) fix default opacity
    } else {
      if (dom.currentStyle) { // camelCase (e.g. 'marginTop')
        FB.Array.forEach(styleProp.match(/\-([a-z])/g), function(match) {
          styleProp = styleProp.replace(match, match.substr(1,1).toUpperCase());
        });
        y = dom.currentStyle[styleProp];
      } else { // dashes (e.g. 'margin-top')
        FB.Array.forEach(styleProp.match(/[A-Z]/g), function(match) {
          styleProp = styleProp.replace(match, '-'+ match.toLowerCase());
        });
        if (window.getComputedStyle) {
          y = document.defaultView
           .getComputedStyle(dom,null).getPropertyValue(styleProp);
          // special handling for IE
          // for some reason it doesn't return '0%' for defaults. so needed to
          // translate 'top' and 'left' into '0px'
          if (styleProp == 'background-position-y' ||
              styleProp == 'background-position-x') {
            if (y == 'top' || y == 'left') { y = '0px'; }
          }
        }
      }
    }
    return y;
  },

  /**
   * Sets the style for the element to value
   *
   * note: requires browser specific names to be passed for specials
   *       border-radius -> ('-moz-border-radius', 'border-radius')
   *
   * @param dom {DOMElement} the element
   * @param styleProp {String} the property name
   * @param value {String} the css value to set this property to
   */
  setStyle: function(dom, styleProp, value) {
    var s = dom.style;
    if (styleProp == 'opacity') {
      if (value >= 100) { value = 99.999; } // fix for Mozilla < 1.5b2
      if (value < 0) { value = 0; }
      s.opacity = value/100;
      s.MozOpacity = value/100;
      s.KhtmlOpacity = value/100;
      if (s.filters) { s.filters.alpha.opacity = value; }
    } else { s[styleProp] = value; }
  },

  /**
   * Dynamically add a script tag.
   *
   * @param src {String} the url for the script
   */
  addScript: function(src) {
    var script = document.createElement('script');
    script.type = "text/javascript";
    script.src = src;
    return document.getElementsByTagName('HEAD')[0].appendChild(script);
  },

  /**
   * Add CSS rules using a <style> tag.
   *
   * @param styles {String} the styles
   * @param names {Array} the component names that the styles represent
   */
  addCssRules: function(styles, names) {
    if (!FB.Dom._cssRules) {
      FB.Dom._cssRules = {};
    }

    // note, we potentially re-include CSS if it comes with other CSS that we
    // have previously not included.
    var allIncluded = true;
    FB.Array.forEach(names, function(id) {
      if (!(id in FB.Dom._cssRules)) {
        allIncluded = false;
        FB.Dom._cssRules[id] = true;
      }
    });

    if (allIncluded) {
      return;
    }

//#JSCOVERAGE_IF
    if (FB.Dom.getBrowserType() != 'ie') {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = styles;
      document.getElementsByTagName('HEAD')[0].appendChild(style);
    } else {
      try {
        document.createStyleSheet().cssText = styles;
      } catch (exc) {
        // major problem on IE : You can only create 31 stylesheet objects with
        // this method. We will have to add the styles into an existing
        // stylesheet.
        if (document.styleSheets[0]) {
          document.styleSheets[0].cssText += styles;
        }
      }
    }
  },

  /**
   * Get browser type.
   *
   * @return string 'ie' | 'mozilla' |'safari' | 'other'
   */
  getBrowserType: function() {
    if (!FB.Dom._browserType) {
      var
        userAgent = window.navigator.userAgent.toLowerCase(),
        // list of known browser. NOTE: the order is important
        keys  = ['msie', 'firefox', 'safari', 'gecko'],
        names = ['ie',   'mozilla', 'safari', 'mozilla'];
      for (var i = 0; i < keys.length; i++) {
        if (userAgent.indexOf(keys[i]) >= 0) {
          FB.Dom._browserType = names[i];
          break;
        }
      }
    }
    return FB.Dom._browserType;
  },

  /**
   * Get the viewport info. Contains size and scroll offsets.
   *
   * @returns {Object} with the width and height
   */
  getViewportInfo: function() {
    // W3C compliant, or fallback to body
    var root = (document.documentElement && document.compatMode == 'CSS1Compat')
      ? document.documentElement
      : document.body;
    return {
      scrollTop  : root.scrollTop,
      scrollLeft : root.scrollLeft,
      width      : self.innerWidth  ? self.innerWidth  : root.clientWidth,
      height     : self.innerHeight ? self.innerHeight : root.clientHeight
    };
  },

  /**
   * Bind a function to be executed when the DOM is ready. It will be executed
   * immediately if the DOM is already ready.
   *
   * @param {Function} the function to invoke when ready
   */
  ready: function(fn) {
    if (FB.Dom._isReady) {
      fn();
    } else {
      FB.Event.subscribe('dom.ready', fn);
    }
  }
});

// NOTE: This code is self-executing. This is necessary in order to correctly
// determine the ready status.
(function() {
  // Handle when the DOM is ready
  function domReady() {
    FB.Dom._isReady = true;
    FB.Event.fire('dom.ready');
    FB.Event.clear('dom.ready');
  }

  // In case we're already ready.
  if (FB.Dom._isReady || document.readyState == 'complete') {
    return domReady();
  }

  // Good citizens.
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', domReady, false);
  // Bad citizens.
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', domReady);
  }

  // Bad citizens.
  // If IE is used and page is not in a frame, continuously check to see if
  // the document is ready
  if (FB.Dom.getBrowserType() == 'ie' && window === top) {
    (function() {
      try {
        // If IE is used, use the trick by Diego Perini
        // http://javascript.nwbox.com/IEContentLoaded/
        document.documentElement.doScroll('left');
      } catch(error) {
        setTimeout(arguments.callee, 0);
        return;
      }

      // and execute any waiting functions
      domReady();
    })();
  }

  // Ultimate Fallback.
  var oldonload = window.onload;
  window.onload = function() {
    domReady();
    if (oldonload) {
      if (typeof oldonload == 'string') {
        eval(oldonload);
      } else {
        oldonload();
      }
    }
  };
})();
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.obj
 * @requires fb.type
 *           fb.json
 *           fb.event
 */

/**
 * Base object type that support events.
 *
 * @class FB.Obj
 * @private
 */
FB.Class('Obj', null,
  FB.copy({
    /**
     * Set property on an object and fire property changed event if changed.
     *
     * @param {String} Property name. A event with the same name
     *                 will be fire when the property is changed.
     * @param {Object} new value of the property
     * @private
     */
     setProperty: function(name, value) {
       // Check if property actually changed
       if (FB.JSON.stringify(value) != FB.JSON.stringify(this[name])) {
         this[name] = value;
         this.fire(name, value);
       }
     }
  }, FB.EventProvider)
);
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.string
 * @layer basic
 * @requires fb.prelude
 *
 */

/**
 * Utility function related to Strings.
 *
 * @class FB.String
 * @static
 * @private
 */
FB.provide('String', {
  /**
   * Strip leading and trailing whitespace.
   *
   * @param s {String} the string to trim
   * @returns {String} the trimmed string
   */
  trim: function(s) {
    return s.replace(/^\s*|\s*$/g, '');
  },

  /**
   * Format a string.
   *
   * Example:
   *     FB.String.format('{0}.facebook.com/{1}', 'www', 'login.php')
   * Returns:
   *     'www.facebook.com/login.php'
   *
   * Example:
   *     FB.String.format('foo {0}, {1}, {0}', 'x', 'y')
   * Returns:
   *     'foo x, y, x'
   *
   * @static
   * @param format {String} the format specifier
   * @param arguments {...} placeholder arguments
   * @returns {String} the formatted string
   */
  format: function(format) {
    if (!FB.String.format._formatRE) {
      FB.String.format._formatRE = /(\{[^\}^\{]+\})/g;
    }

    var values = arguments;

    return format.replace(
      FB.String.format._formatRE,
      function(str, m) {
        var
          index = parseInt(m.substr(1), 10),
          value = values[index + 1];
        if (value === null || value === undefined) {
          return '';
        }
        return value.toString();
      }
    );
  },

  /**
   * Escape an string so that it can be embedded inside another string
   * as quoted string.
   *
   * @param value {String} string to quote
   * @return {String} an quoted string
   */
  quote: function(value) {
    var
      quotes = /["\\\x00-\x1f\x7f-\x9f]/g,
      subst = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
      };

    return quotes.test(value) ?
      '"' + value.replace(quotes, function (a) {
        var c = subst[a];
        if (c) {
          return c;
        }
        c = a.charCodeAt();
        return '\\u00' + Math.floor(c/16).toString(16) + (c % 16).toString(16);
      }) + '"' :
      '"' + value + '"';
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.waitable
 * @layer data
 * @requires fb.prelude fb.type fb.string fb.array fb.event fb.obj
 */

/**
 * A container for asynchronous data that may not be available immediately.
 * This is base type for results returned from FB.Data.query()
 * method.
 *
 * @class FB.Waitable
 */
FB.subclass('Waitable', 'Obj',
  /**
   * Construct a Waitable object.
   *
   * @access private
   * @constructor
   */
  function() {},
  {
  /**
   * Set value property of the data object. This will
   * cause "value" event to be fire on the object. Any callback functions
   * that are waiting for the data through wait() methods will be invoked
   * if the value was previously not set.
   *
   * @private
   * @param {Object} value new value for the Waitable
   */
  set: function(value) {
    this.setProperty('value', value);
  },


  /**
   * Fire the error event.
   *
   * @access private
   * @param ex {Exception} the exception object
   */
  error: function(ex) {
    this.fire("error", ex);
  },

  /**
   * Register a callback for an asynchronous value, which will be invoked when
   * the value is ready.
   *
   * Example
   * -------
   *
   * In this
   *      val v = get_a_waitable();
   *      v.wait(function (value) {
   *        // handle the value now
   *      },
   *      function(error) {
   *        // handle the errro
   *      });
   *      // later, whoever generated the waitable will call .set() and
   *      // invoke the callback
   *
   * @param {Function} callback A callback function that will be invoked
   * when this.value is set. The value property will be passed to the
   * callback function as a parameter
   * @param {Function} errorHandler [optional] A callback function that
   * will be invoked if there is an error in getting the value. The errorHandler
   * takes an optional Error object.
   */
  wait: function(callback, errorHandler) {
    // register error handler first incase the monitor call causes an exception
    if (errorHandler) {
      this.subscribe('error', errorHandler);
    }

    this.monitor('value', this.bind(function() {
      if (this.value !== undefined) {
        callback(this.value);
        return true;
      }
    }));
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.data.query
 * @layer data
 * @requires fb.waitable
 */

/**
 * Object that represents the results of an asynchronous FQL query, typically
 * constructed by a call [FB.Data.query](FB.Data.query)().
 *
 * These objects can be used in one of two ways:
 *
 * * Call [wait](FB.Waitable.wait)() to handle the value when it's ready:
 *
 *         var query = FB.Data.query(
 *           'select name from page where username = 'barackobama');
 *         query.wait(function(result) {
 *           document.getElementById('page').innerHTML = result[0].name
 *         });
 *
 * * Pass it as an argument to a function that takes a Waitable. For example,
 *   in this case you can construct the second query without waiting for the
 *   results from the first, and it will combine them into one request:
 *
 *         var query = FB.Data.query(
 *           'select username from page where page_id = 6815841748');
 *         var dependentQuery = FB.Data.query(
 *           'select name from page where username in ' +
 *           '(select username from {0})', query);
 *
 *         // now wait for the results from the dependent query
 *         dependentQuery.wait(function(data) {
 *           document.getElementById('page').innerHTML = result[0].name
 *         });
 *
 * * Wait for multiple waitables at once with [FB.Data.waitOn](FB.Data.waitOn).
 *
 * Check out the [tests][tests] for more usage examples.
 * [tests]: http://github.com/facebook/connect-js/blob/master/tests/js/data.js
 *
 * @class FB.Data.Query
 * @access public
 * @extends FB.Waitable
 */
FB.subclass('Data.Query', 'Waitable',
  function() {
    if (!FB.Data.Query._c) {
      FB.Data.Query._c = 1;
    }
    this.name = 'v_' + FB.Data.Query._c++;
  },
  {
  /**
   * Use the array of arguments using the FB.String.format syntax to build a
   * query, parse it and populate this Query instance.
   *
   * @params args
   */
  parse: function(args) {
    var
      fql = FB.String.format.apply(null, args),
      re = (/^select (.*?) from (\w+)\s+where (.*)$/i).exec(fql); // Parse it
    this.fields = this._toFields(re[1]);
    this.table = re[2];
    this.where = this._parseWhere(re[3]);

    for (var i=1; i < args.length; i++) {
      if (FB.Type.isType(args[i], FB.Data.Query)) {
        // Indicate this query can not be merged because
        // others depend on it.
        args[i].hasDependency = true;
      }
    }

    return this;
  },

  /**
   * Renders the query in FQL format.
   *
   * @return {String} FQL statement for this query
   */
  toFql: function() {
    var s = 'select ' + this.fields.join(',') + ' from ' +
            this.table + ' where ';
    switch (this.where.type) {
      case 'unknown':
        s += this.where.value;
        break;
      case 'index':
        s += this.where.key + '=' + this._encode(this.where.value);
        break;
      case 'in':
        if (this.where.value.length == 1) {
          s += this.where.key + '=' +  this._encode(this.where.value[0]);
        } else {
          s += this.where.key + ' in (' +
            FB.Array.map(this.where.value, this._encode).join(',') + ')';
        }
        break;
    }
    return s;
  },

  /**
   * Encode a given value for use in a query string.
   *
   * @param value {Object} the value to encode
   * @returns {String} the encoded value
   */
  _encode: function(value) {
    return typeof(value) == 'string' ? FB.String.quote(value) : value;
  },

  /**
   * Return the name for this query.
   *
   * TODO should this be renamed?
   *
   * @returns {String} the name
   */
  toString: function() {
    return '#' + this.name;
  },

  /**
   * Return an Array of field names extracted from a given string. The string
   * here is a comma separated list of fields from a FQL query.
   *
   * Example:
   *     query._toFields('abc, def,  ghi ,klm')
   * Returns:
   *     ['abc', 'def', 'ghi', 'klm']
   *
   * @param s {String} the field selection string
   * @returns {Array} the fields
   */
  _toFields: function(s) {
    return FB.Array.map(s.split(','), FB.String.trim);
  },

  /**
   * Parse the where clause from a FQL query.
   *
   * @param s {String} the where clause
   * @returns {Object} parsed where clause
   */
  _parseWhere: function(s) {
    // First check if the where is of pattern
    // key = XYZ
    var
      re = (/^\s*(\w+)\s*=\s*(.*)\s*$/i).exec(s),
      result,
      value,
      type = 'unknown';
    if (re) {
      // Now check if XYZ is either an number or string.
      value = re[2];
      // The RegEx expression for checking quoted string
      // is from http://blog.stevenlevithan.com/archives/match-quoted-string
      if (/^(["'])(?:\\?.)*?\1$/.test(value)) {
        // Use eval to unquote the string
        // convert
        value = eval(value);
        type = 'index';
      } else if (/^\d+\.?\d*$/.test(value)) {
        type = 'index';
      }
    }

    if (type == 'index') {
      // a simple <key>=<value> clause
      result = { type: 'index', key: re[1], value: value };
    } else {
      // Not a simple <key>=<value> clause
      result = { type: 'unknown', value: s };
    }
    return result;
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.data
 * @layer data
 * @requires fb.prelude
 *           fb.type
 *           fb.api
 *           fb.array
 *           fb.string
 *           fb.obj
 *           fb.data.query
 *           fb.json
 */


/**
 * Data access class for accessing Facebook data efficiently.
 *
 * FB.Data is a data layer that offers the following advantages over
 * direct use of FB.Api:
 *
 * 1. Reduce number of individual HTTP requests through the following
 *    optimizations:
 *
 *   a. Automatically combine individual data requests into a single
 *      multi-query request.
 *
 *   b. Automatic query optimization.
 *
 *   c. Enable caching of data through browser local cache (not implemented yet)
 *
 * 2. Reduce complexity of asynchronous API programming, especially multiple
 *     asynchronous request, though FB.Waitable and FB.waitOn.
 *
 * @class FB.Data
 * @access public
 * @static
 */
FB.provide('Data', {
  /**
   * Performs a parameterized FQL query and returns a [FB.Data.query](FB.Data.query)
   * object which can be waited on for the asynchronously fetched data.
   *
   * Examples
   * --------
   *
   * Make a simple FQL call and handle the results.
   *
   *      var query = FB.Data.query('select name, uid from user where uid={0}',
   *                                user_id);
   *      query.wait(function(rows) {
   *        document.getElementById('name').innerHTML =
   *          'Your name is ' + rows[0].name;
   *      });
   *
   * Display the names and events of 10 random friends. This can't be done
   * using a simple FQL query because you need more than one field from more
   * than one table, so we use FB.Data.query to help construct the call to
   * [[api:fql.multiquery]].
   *
   *      // First, get ten of the logged-in user's friends and the events they
   *      // are attending. In this query, the argument is just an int value
   *      // (the logged-in user id). Note, we are not firing the query yet.
   *      var query = FB.Data.query(
   *            "select uid, eid from event_member "
   *          + "where uid in "
   *          + "(select uid2 from friend where uid1 = {0}"
   *          + " order by rand() limit 10)",
   *          user_id);
   *
   *      // Now, construct two dependent queries - one each to get the
   *      // names of the friends and the events referenced
   *      var friends = FB.Data.query(
   *            "select uid, name from user where uid in "
   *          + "(select uid from {0})", query);
   *      var events = FB.Data.query(
   *            "select eid, name from event where eid in "
   *          + " (select eid from {0})", query);
   *
   *      // Now, register a callback which will execute once all three
   *      // queries return with data
   *      FB.Data.waitOn([query, friends, events], function() {
   *        // build a map of eid, uid to name
   *        var eventNames = friendNames = {};
   *        FB.Array.forEach(events.value, function(row) {
   *          eventNames[row.eid] = row.name;
   *        });
   *        FB.Array.forEach(friends.value, function(row) {
   *          friendNames[row.uid] = row.name;
   *        });
   *
   *        // now display all the results
   *        var html = '';
   *        FB.Array.forEach(query.value, function(row) {
   *          html += '<p>'
   *            + friendNames[row.uid]
   *            + ' is attending '
   *            + eventNames[row.eid]
   *            + '</p>';
   *        });
   *        document.getElementById('display').innerHTML = html;
   *      });
   *
   * @param {String} template FQL query string template. It can contains
   * optional formatted parameters in the format of '{<argument-index>}'.
   * @param {Object} data optional 0-n arguments of data. The arguments can be
   * either real data (String or Integer) or an [FB.Data.query](FB.Data.query)
   * object from a previos [FB.Data.query](FB.Data.query).
   * @return {FB.Data.Query}
   * An async query object that contains query result.
   */
  query: function(template, data) {
    var query = new FB.Data.Query().parse(arguments);
    FB.Data.queue.push(query);
    FB.Data._waitToProcess();
    return query;
  },

  /**
   * Wait until the results of all queries are ready. See also
   * [FB.Data.query](FB.Data.query) for more examples of usage.
   *
   * Examples
   * --------
   *
   * Wait for several queries to be ready, then perform some action:
   *
   *      var queryTemplate = 'select name from profile where id={0}';
   *      var u1 = FB.Data.query(queryTemplate, 4);
   *      var u2 = FB.Data.query(queryTemplate, 1160);
   *      FB.Data.waitOn([u1, u2], function(args) {
   *        log('u1 value = '+ args[0].value);
   *        log('u2 value = '+ args[1].value);
   *      });
   *
   * Same as above, except we take advantage of JavaScript closures to
   * avoid using args[0], args[1], etc:
   *
   *      var queryTemplate = 'select name from profile where id={0}';
   *      var u1 = FB.Data.query(queryTemplate, 4);
   *      var u2 = FB.Data.query(queryTemplate, 1160);
   *      FB.Data.waitOn([u1, u2], function(args) {
   *        log('u1 value = '+ u1.value);
   *        log('u2 value = '+ u2.value);
   *      });
   *
   * Create a new Waitable that computes its value based on other Waitables:
   *
   *      var friends = FB.Data.query('select uid2 from friend where uid1={0}',
   *                                  FB.getSession().uid);
   *      // ...
   *      // Create a Waitable that is the count of friends
   *      var count = FB.Data.waitOn([friends], 'args[0].length');
   *      displayFriendsCount(count);
   *      // ...
   *      function displayFriendsCount(count) {
   *        count.wait(function(result) {
   *          log('friends count = ' + result);
   *        });
   *      }
   *
   * You can mix Waitables and data in the list of dependencies
   * as well.
   *
   *      var queryTemplate = 'select name from profile where id={0}';
   *      var u1 = FB.Data.query(queryTemplate, 4);
   *      var u2 = FB.Data.query(queryTemplate, 1160);
   *
   *      // FB.getSession().uid is just an Integer
   *      FB.Data.waitOn([u1, u2, FB.getSession().uid], function(args) {
   *          log('u1 = '+ args[0]);
   *          log('u2 = '+ args[1]);
   *          log('uid = '+ args[2]);
   *       });
   *
   * @param dependencies {Array} an array of dependencies to wait on. Each item
   * could be a Waitable object or actual value.
   * @param callback {Function} A function callback that will be invoked
   * when all the data are ready. An array of ready data will be
   * passed to the callback. If a string is passed, it will
   * be evaluted as a JavaScript string.
   * @return {FB.Waitable} A Waitable object that will be set with the return
   * value of callback function.
   */
  waitOn: function(dependencies, callback) {
    var
      result = new FB.Waitable(),
      count = dependencies.length;

    // For developer convenience, we allow the callback
    // to be a string of javascript expression
    if (typeof(callback) == 'string') {
      var s = callback;
      callback = function(args) {
        return eval(s);
      };
    }

    FB.Array.forEach(dependencies, function(item) {
      item.monitor('value', function() {
        var done = false;
        if (FB.Data._getValue(item) !== undefined) {
          count--;
          done = true;
        }
        if (count === 0) {
          var value = callback(FB.Array.map(dependencies, FB.Data._getValue));
          result.set(value !== undefined ? value : true);
        }
        return done;
      });
    });
    return result;
  },

  /**
   * Helper method to get value from Waitable or return self.
   *
   * @param item {FB.Waitable|Object} potential Waitable object
   * @returns {Object} the value
   */
  _getValue: function(item) {
    return FB.Type.isType(item, FB.Waitable) ? item.value : item;
  },

  /**
   * Alternate method from query, this method is more specific but more
   * efficient. We use it internally.
   *
   * @access private
   * @param fields {Array} the array of fields to select
   * @param table {String} the table name
   * @param name {String} the key name
   * @param value {Object} the key value
   * @returns {FB.Data.Query} the query object
   */
  _selectByIndex: function(fields, table, name, value) {
    var query = new FB.Data.Query();
    query.fields = fields;
    query.table = table;
    query.where = { type: 'index', key: name, value: value };
    FB.Data.queue.push(query);
    FB.Data._waitToProcess();
    return query;
  },

  /**
   * Set up a short timer to ensure that we process all requests at once. If
   * the timer is already set then ignore.
   */
  _waitToProcess: function() {
    if (FB.Data.timer < 0) {
      FB.Data.timer = setTimeout(FB.Data._process, 10);
    }
  },

  /**
   * Process the current queue.
   */
  _process: function() {
    FB.Data.timer = -1;

    var
      mqueries = {},
      q = FB.Data.queue;
    FB.Data.queue = [];

    for (var i=0; i < q.length; i++) {
      var item = q[i];
      if (item.where.type == 'index' && !item.hasDependency) {
        FB.Data._mergeIndexQuery(item, mqueries);
      } else {
        mqueries[item.name] = item;
      }
    }

    // Now make a single multi-query API call
    var params = { method: 'fql.multiquery', queries: {} };
    FB.copy(params.queries, mqueries, true, function(query) {
      return query.toFql();
    });

    params.queries = FB.JSON.stringify(params.queries);

    FB.api(params, function(result) {
      if (result.error_msg) {
        FB.Array.forEach(mqueries, function(q) {
          q.error(Error(result.error_msg));
        });
      } else {
        FB.Array.forEach(result, function(o) {
          mqueries[o.name].set(o.fql_result_set);
        });
      }
    });
  },

  /**
   * Check if y can be merged into x
   * @private
   */
  _mergeIndexQuery: function(item, mqueries) {
    var key = item.where.key,
    value = item.where.value;

    var name = 'index_' +  item.table + '_' + key;
    var master = mqueries[name];
    if (!master) {
      master = mqueries[name] = new FB.Data.Query();
      master.fields = [key];
      master.table = item.table;
      master.where = {type: 'in', key: key, value: []};
    }

    // Merge fields
    FB.Array.merge(master.fields, item.fields);
    FB.Array.merge(master.where.value, [value]);

    // Link data from master to item
    master.wait(function(r) {
      item.set(FB.Array.filter(r, function(x) {
        return x[key] == value;
      }));
    });
  },

  timer: -1,
  queue: []
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.element
 * @layer xfbml
 * @requires fb.type fb.event fb.array
 */

/**
 * Base class for all XFBML elements. To create your own XFBML element, make a
 * class that derives from this, and then call [FB.XFBML.registerTag](FB.XFBML.registerTag).
 *
 * @access private
 * @class FB.XFBML.Element
 */
FB.Class('XFBML.Element',
  /**
   * Create a new Element.
   *
   * @access private
   * @constructor
   * @param dom {DOMElement} the DOMElement for the tag
   */
  function(dom) {
    this.dom = dom;
  },

  FB.copy({
  /**
   * Get the value of an attribute associated with this tag.
   *
   * Note, the transform function is never executed over the default value. It
   * is only used to transform user set attribute values.
   *
   * @access private
   * @param name {String} Name of the attribute.
   * @param defaultValue {Object} Default value if attribute isn't set.
   * @param transform {Function} Optional function to transform found value.
   * @return {Object} final value
   */
  getAttribute: function(name, defaultValue, transform) {
    var value = (
      this.dom.getAttribute(name) ||
      this.dom.getAttribute(name.replace(/-/g, '_')) ||
      this.dom.getAttribute(name.replace(/-/g, ''))
    );
    return value ? (transform ? transform(value) : value) : defaultValue;
  },

  /**
   * Helper function to extract boolean attribute value.
   *
   * @access private
   * @param name {String} Name of the attribute.
   * @param defaultValue {Object} Default value if attribute isn't set.
   */
  _getBoolAttribute: function(name, defaultValue) {
    return this.getAttribute(name, defaultValue, function(s) {
      s = s.toLowerCase();
      return s == 'true' || s == '1' || s == 'yes' || s == 'on';
    });
  },

  /**
   * Get an integer value for size in pixels.
   *
   * @access private
   * @param name {String} Name of the attribute.
   * @param defaultValue {Object} Default value if attribute isn't set.
   */
  _getPxAttribute: function(name, defaultValue) {
    return this.getAttribute(name, defaultValue, function(s) {
      var size = parseInt(s.replace('px', ''), 10);
      if (isNaN(size)) {
        return defaultValue;
      } else {
        return size;
      }
    });
  },

  /**
   * Get a value if it is in the allowed list, otherwise return the default
   * value. This function ignores case and expects you to use only lower case
   * allowed values.
   *
   * @access private
   * @param name {String} Name of the attribute.
   * @param defaultValue {Object} Default value
   * @param allowed {Array} List of allowed values.
   */
  _getAttributeFromList: function(name, defaultValue, allowed) {
    return this.getAttribute(name, defaultValue, function(s) {
      s = s.toLowerCase();
      if (FB.Array.indexOf(allowed, s) > -1) {
        return s;
      } else {
        return defaultValue;
      }
    });
  },

  /**
   * Check if this node is still valid and in the document.
   *
   * @access private
   * @returns {Boolean} true if element is valid
   */
  isValid: function() {
    for (var dom = this.dom; dom; dom = dom.parentNode) {
      if (dom == document.body) {
        return true;
      }
    }
  },

  /**
   * Clear this element and remove all contained elements.
   *
   * @access private
   */
  clear: function() {
    this.dom.innerHTML = '';
  }
}, FB.EventProvider));
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml
 * @layer xfbml
 * @requires fb.prelude
 *           fb.array
 */

/**
 * Methods for the rendering of [[wiki:XFBML]] tags.
 *
 * To render the tags, simply put the tags anywhere in your page, and then
 * call:
 *
 *      FB.XFBML.parse();
 *
 * @class FB.XFBML
 * @static
 */
FB.provide('XFBML', {
  /**
   * The time allowed for all tags to finish rendering.
   *
   * @type Number
   */
  _renderTimeout: 30000,

  /**
   * Parse and render XFBML markup in the document.
   *
   * Examples
   * --------
   *
   * By default, this is all you need to make XFBML work:
   *
   *       FB.XFBML.parse();
   *
   * Alternately, you may want to only evaluate a portion of
   * the document. In that case, you can pass in the elment.
   *
   *       FB.XFBML.parse(document.getElementById('foo'));
   *
   * @access public
   * @param dom {DOMElement} (optional) root DOM node, defaults to body
   * @param cb {Function} (optional) invoked when elements are rendered
   */
  parse: function(dom, cb) {
    dom = dom || document.body;

    // We register this function on each tag's "render" event. This allows us
    // to invoke the callback when we're done rendering all the found elements.
    //
    // We start with count=1 rather than 0, and finally call onTagDone() after
    // we've kicked off all the tag processing. This ensures that we do not hit
    // count=0 before we're actually done queuing up all the tags.
    var
      count = 1,
      onTagDone = function() {
        count--;
        if (count === 0) {
          // Invoke the user specified callback for this specific parse() run.
          cb && cb();

          // Also fire a global event. A global event is fired for each
          // invocation to FB.XFBML.parse().
          FB.Event.fire('xfbml.render');
        }
      };

    // First, find all tags that are present
    FB.Array.forEach(FB.XFBML._tagInfos, function(tagInfo) {
      // default the xmlns if needed
      if (!tagInfo.xmlns) {
        tagInfo.xmlns = 'fb';
      }

      var xfbmlDoms = FB.XFBML._getDomElements(
        dom,
        tagInfo.xmlns,
        tagInfo.localName
      );
      for (var i=0; i < xfbmlDoms.length; i++) {
        count++;
        FB.XFBML._processElement(xfbmlDoms[i], tagInfo, onTagDone);
      }
    });

    // Setup a timer to ensure all tags render within a given timeout
    window.setTimeout(function() {
      if (count > 0) {
        FB.log(
          count + ' XFBML tags failed to render in ' +
          FB.XFBML._renderTimeout + 'ms.'
        );
      }
    }, FB.XFBML._renderTimeout);
    // Call once to handle count=1 as described above.
    onTagDone();
  },

  /**
   * Register a custom XFBML tag. If you create an custom XFBML tag, you can
   * use this method to register it so the it can be treated like
   * any build-in XFBML tags.
   *
   * Example
   * -------
   *
   * Register fb:name tag that is implemented by class FB.XFBML.Name
   *       tagInfo = {xmlns: 'fb',
   *                  localName: 'name',
   *                  className: 'FB.XFBML.Name'},
   *       FB.XFBML.registerTag(tagInfo);
   *
   * @access private
   * @param {Object} tagInfo
   * an object containiner the following keys:
   * - xmlns
   * - localName
   * - className
   */
  registerTag: function(tagInfo) {
    FB.XFBML._tagInfos.push(tagInfo);
  },


  //////////////// Private methods ////////////////////////////////////////////

  /**
   * Process an XFBML element.
   *
   * @access private
   * @param dom {DOMElement} the dom node
   * @param tagInfo {Object} the tag information
   * @param cb {Function} the function to bind to the "render" event for the tag
   */
  _processElement: function(dom, tagInfo, cb) {
    // Check if element for the dom already exists
    var element = dom._element;
    if (element) {
      element.subscribe('render', cb);
      element.process();
    } else {
      var processor = function() {
        var fn = eval(tagInfo.className);

        // TODO(naitik) cleanup after f8
        //
        // currently, tag initialization is done via a constructor function,
        // there by preventing a tag implementation to vary between two types
        // of objects. post f8, this should be changed to a factory function
        // which would allow the login button to instantiate the Button based
        // tag or Iframe based tag depending on the attribute value.
        var getBoolAttr = function(attr) {
            var attr = dom.getAttribute(attr);
            return (attr && FB.Array.indexOf(
                      ['true', '1', 'yes', 'on'],
                      attr.toLowerCase()) > -1);
        }

        var isLogin = false;
        var showFaces = true;
        var renderInIframe = false;
        if (tagInfo.className === 'FB.XFBML.LoginButton') {
          renderInIframe = getBoolAttr('render-in-iframe');
          showFaces = getBoolAttr('show-faces');
          isLogin = renderInIframe || showFaces;
          if (isLogin) {
            fn = FB.XFBML.Login;
          }
        }

        element = dom._element = new fn(dom);
        if (isLogin) {
          var extraParams = {show_faces: showFaces};
          var perms = dom.getAttribute('perms');
          if (perms) {
            extraParams['perms'] = perms;
          }
          element.setExtraParams(extraParams);
        }

        element.subscribe('render', cb);
        element.process();

      };

      if (FB.CLASSES[tagInfo.className.substr(3)]) {
        processor();
      } else {
        FB.log('Tag ' + tagInfo.className + ' was not found.');
      }
    }
  },

  /**
   * Get all the DOM elements present under a given node with a given tag name.
   *
   * @access private
   * @param dom {DOMElement} the root DOM node
   * @param xmlns {String} the XML namespace
   * @param localName {String} the unqualified tag name
   * @return {DOMElementCollection}
   */
  _getDomElements: function(dom, xmlns, localName) {
    // Different browsers behave slightly differently in handling tags
    // with custom namespace.
    var fullName = xmlns + ':' + localName;

    switch (FB.Dom.getBrowserType()) {
    case 'mozilla':
      // Use document.body.namespaceURI as first parameter per
      // suggestion by Firefox developers.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=531662
      return dom.getElementsByTagNameNS(document.body.namespaceURI, fullName);
    case 'ie':
      // accessing document.namespaces when the library is being loaded
      // asynchronously can cause an error if the document is not yet ready
      try {
        var docNamespaces = document.namespaces;
        if (docNamespaces && docNamespaces[xmlns]) {
          return dom.getElementsByTagName(localName);
        }
      } catch(e) {
        // introspection doesn't yield any identifiable information to scope
      }

      // It seems that developer tends to forget to declare the fb namespace
      // in the HTML tag (xmlns:fb="http://www.facebook.com/2008/fbml") IE
      // has a stricter implementation for custom tags. If namespace is
      // missing, custom DOM dom does not appears to be fully functional. For
      // example, setting innerHTML on it will fail.
      //
      // If a namespace is not declared, we can still find the element using
      // GetElementssByTagName with namespace appended.
      return dom.getElementsByTagName(fullName);
    default:
      return dom.getElementsByTagName(fullName);
    }
  },

  /**
   * Register the default set of base tags. Each entry must have a localName
   * and a className property, and can optionally have a xmlns property which
   * if missing defaults to 'fb'.
   *
   * NOTE: Keep the list alpha sorted.
   */
  _tagInfos: [
    { localName: 'activity',        className: 'FB.XFBML.Activity'        },
    { localName: 'add-profile-tab', className: 'FB.XFBML.AddProfileTab'   },
    { localName: 'bookmark',        className: 'FB.XFBML.Bookmark'        },
    { localName: 'comments',        className: 'FB.XFBML.Comments'        },
    { localName: 'connect-bar',     className: 'FB.XFBML.ConnectBar'      },
    { localName: 'fan',             className: 'FB.XFBML.Fan'             },
    { localName: 'like',            className: 'FB.XFBML.Like'            },
    { localName: 'like-box',        className: 'FB.XFBML.LikeBox'         },
    { localName: 'live-stream',     className: 'FB.XFBML.LiveStream'      },
    { localName: 'login',           className: 'FB.XFBML.Login'           },
    { localName: 'login-button',    className: 'FB.XFBML.LoginButton'     },
    { localName: 'facepile',        className: 'FB.XFBML.Facepile'        },
    { localName: 'friendpile',      className: 'FB.XFBML.Friendpile'      },
    { localName: 'name',            className: 'FB.XFBML.Name'            },
    { localName: 'profile-pic',     className: 'FB.XFBML.ProfilePic'      },
    { localName: 'recommendations', className: 'FB.XFBML.Recommendations' },
    { localName: 'serverfbml',      className: 'FB.XFBML.ServerFbml'      },
    { localName: 'share-button',    className: 'FB.XFBML.ShareButton'     },
    { localName: 'social-bar',      className: 'FB.XFBML.SocialBar'       }
  ]
});

/*
 * For IE, we will try to detect if document.namespaces contains 'fb' already
 * and add it if it does not exist.
 */
// wrap in a try/catch because it can throw an error if the library is loaded
// asynchronously and the document is not ready yet
(function() {
  try {
    if (document.namespaces && !document.namespaces.item.fb) {
       document.namespaces.add('fb');
    }
  } catch(e) {
    // introspection doesn't yield any identifiable information to scope
  }
}());
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.helper
 * @layer xfbml
 * @requires fb.prelude
 */

/**
 * Helper class for XFBML
 * @class FB.Helper
 * @static
 * @private
 */
FB.provide('Helper', {
  /**
   * Check if an id is an user id, instead of a page id
   *
   * [NOTE:] This code is based on is_user_id function in our server code.
   * If that function changes, we'd have to update this one as well.
   *
   * @param {uid} id
   * @returns {Boolean} true if the given id is a user id
   */
  isUser: function(id) {
    return id < 2200000000 || (
              id >= 100000000000000 &&  // 100T is first 64-bit UID
              id <= 100099999989999); // 100T + 3,333,333*30,000 - 1)
  },

  /**
   * Return the current user's UID if available.
   *
   * @returns {String|Number} returns the current user's UID or null
   */
  getLoggedInUser: function() {
    return FB._session ? FB._session.uid : null;
  },

  /**
   * Uppercase the first character of the String.
   *
   * @param s {String} the string
   * @return {String} the string with an uppercase first character
   */
  upperCaseFirstChar: function(s) {
    if (s.length > 0) {
      return s.substr(0, 1).toUpperCase() + s.substr(1);
    }
    else {
      return s;
    }
  },

  /**
   * Link to the explicit href or profile.php.
   *
   * @param userInfo {FB.UserInfo} User info object.
   * @param html {String} Markup for the anchor tag.
   * @param href {String} Custom href.
   * @returns {String} the anchor tag markup
   */
  getProfileLink: function(userInfo, html, href) {
    href = href || (userInfo ? FB._domain.www + 'profile.php?id=' +
                    userInfo.uid : null);
    if (href) {
      html = '<a class="fb_link" href="' + href + '">' + html + '</a>';
    }
    return html;
  },

  /**
   * Convenienve function to fire an event handler attribute value. This is a
   * no-op for falsy values, eval for strings and invoke for functions.
   *
   * @param handler {Object}
   * @param scope {Object}
   * @param args {Array}
   */
  invokeHandler: function(handler, scope, args) {
    if (handler) {
      if (typeof handler === 'string') {
        eval(handler);
      } else if (handler.apply) {
        handler.apply(scope, args || []);
      }
    }
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.iframewidget
 * @layer xfbml
 * @requires fb.type
 *           fb.event
 *           fb.xfbml.element
 *           fb.content
 *           fb.qs
 *           fb.css.iframewidget
 */

/**
 * Base implementation for iframe based XFBML Widgets.
 *
 * @class FB.XFBML.IframeWidget
 * @extends FB.XFBML.Element
 * @private
 */
FB.subclass('XFBML.IframeWidget', 'XFBML.Element', null, {
  /**
   * Indicate if the loading animation should be shown while the iframe is
   * loading.
   */
  _showLoader: true,

  /**
   * Indicate if the widget should be reprocessed when the user enters or
   * leaves the "unknown" state. (Logs in/out of facebook, but not the
   * application.)
   */
  _refreshOnAuthChange: false,

  /**
   * Indicates if the widget should be reprocessed on auth.statusChange events.
   * This is the default for XFBML Elements, but is usually undesirable for
   * Iframe Widgets.
   */
  _allowReProcess: false,

  /**
   * Indicates when the widget will be made visible.
   *
   *   load: when the iframe's page onload event is fired
   *   resize: when the first resize message is received
   */
  _visibleAfter: 'load',

  /////////////////////////////////////////////////////////////////////////////
  // Methods the implementation MUST override
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Implemented by the inheriting class to return a **name** and **params**.
   *
   * The name is the the file name in the plugins directory. So the name "fan"
   * translates to the path "/plugins/fan.php". This enforces consistency.
   *
   * The params should be the query params needed for the widget. API Key,
   * Session Key, SDK and Locale are automatically included.
   *
   * @return {Object} an object containing a **name** and **params**.
   */
  getUrlBits: function() {
    throw new Error('Inheriting class needs to implement getUrlBits().');
  },

  /////////////////////////////////////////////////////////////////////////////
  // Methods the implementation CAN override
  /////////////////////////////////////////////////////////////////////////////

  /**
   * This method is invoked before any processing is done to do any initial
   * setup and do any necessary validation on the attributes. A return value of
   * false will indicate that validation was unsuccessful and processing will
   * be halted. If you are going to return false and halt processing, you
   * should ensure you use FB.log() to output a short informative message
   * before doing so.
   *
   * @return {Boolean} true to continue processing, false to halt it
   */
  setupAndValidate: function() {
    return true;
  },

  /**
   * This is useful for setting up event handlers and such which should not be
   * run again if the widget is reprocessed.
   */
  oneTimeSetup: function() {},

  /**
   * Implemented by the inheriting class to return the initial size for the
   * iframe. If the inheriting class does not implement this, we default to
   * null which implies no element level style. This is useful if you are
   * defining the size based on the className.
   *
   * @return {Object} object with a width and height as Numbers (pixels assumed)
   */
  getSize: function() {},

  /**
   * Implemented by the inheriting class if it needs to override the name
   * attribute of the iframe node. Returning null will auto generate the name.
   *
   * @return {String} the name of the iframe
   */
  getIframeName: function() {},

  /////////////////////////////////////////////////////////////////////////////
  // Public methods the implementation CAN use
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Get a channel url for use with this widget.
   *
   * @return {String} the channel URL
   */
  getChannelUrl: function() {
    if (!this._channelUrl) {
      // parent.parent => the message will be going from cdn => fb => app (with
      // cdn being the deepest frame, and app being the top frame)
      var self = this;
      this._channelUrl = FB.XD.handler(function(message) {
        self.fire('xd.' + message.type, message);
      }, 'parent.parent', true);
    }
    return this._channelUrl;
  },

  /**
   * Returns the iframe node (if it has already been created).
   *
   * @return {DOMElement} the iframe DOM element
   */
  getIframeNode: function() {
    // not caching to allow for the node to change over time without needing
    // house-keeping for the cached reference.
    return this.dom.getElementsByTagName('iframe')[0];
  },

  /////////////////////////////////////////////////////////////////////////////
  // Private methods the implementation MUST NOT use or override
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Inheriting classes should not touch the DOM directly, and are only allowed
   * to override the methods defined at the top.
   *
   * @param force {Boolean} force reprocessing of the node
   */
  process: function(force) {
    // guard agains reprocessing if needed
    if (this._done) {
      if (!this._allowReProcess && !force) {
        return;
      }
      this.clear();
    } else {
      this._oneTimeSetup();
    }
    this._done = true;

    if (!this.setupAndValidate()) {
      // failure to validate means we're done rendering what we can
      this.fire('render');
      return;
    }

    // show the loader if needed
    if (this._showLoader) {
      this._addLoader();
    }

    // it's always hidden by default
    FB.Dom.addCss(this.dom, 'fb_iframe_widget');
    if (this._visibleAfter != 'immediate') {
      FB.Dom.addCss(this.dom, 'fb_hide_iframes');
    } else {
      this.subscribe('iframe.onload', FB.bind(this.fire, this, 'render'));
    }

    // the initial size
    var size = this.getSize() || {};

    // we use a GET request if the URL is less than 2k, otherwise we need to do
    // a <form> POST. we prefer a GET because it prevents the "POST resend"
    // warning browsers shown on page refresh.
    var url = this._getURL() + '?' + FB.QS.encode(this._getQS());
    if (url.length > 2000) {
      // we will POST the form once the empty about:blank iframe is done loading
      url = 'about:blank';
      var onload = FB.bind(function() {
        this._postRequest();
        this.unsubscribe('iframe.onload', onload);
      }, this);
      this.subscribe('iframe.onload', onload);
    }

    FB.Content.insertIframe({
      url    : url,
      root   : this.dom.appendChild(document.createElement('span')),
      name   : this.getIframeName(),
      height : size.height,
      width  : size.width,
      onload : FB.bind(this.fire, this, 'iframe.onload')
    });
  },

  /**
   * Internal one time setup logic.
   */
  _oneTimeSetup: function() {
    // the XD messages we want to handle. it is safe to subscribe to these even
    // if they will not get used.
    this.subscribe('xd.resize', FB.bind(this._handleResizeMsg, this));

    // weak dependency on FB.Auth
    if (FB.getLoginStatus) {
      this.subscribe(
        'xd.refreshLoginStatus',
        FB.bind(FB.getLoginStatus, FB, function(){}, true));
      this.subscribe(
        'xd.logout',
        FB.bind(FB.logout, FB, function(){}));
    }

    // setup forwarding of auth.statusChange events
    if (this._refreshOnAuthChange) {
      this._setupAuthRefresh();
    }

    // if we need to make it visible on iframe load
    if (this._visibleAfter == 'load') {
      this.subscribe('iframe.onload', FB.bind(this._makeVisible, this));
    }

    // hook for subclasses
    this.oneTimeSetup();
  },

  /**
   * Make the iframe visible and remove the loader.
   */
  _makeVisible: function() {
    this._removeLoader();
    FB.Dom.removeCss(this.dom, 'fb_hide_iframes');
    this.fire('render');
  },

  /**
   * Most iframe plugins do not tie their internal state to the "Connected"
   * state of the application. In other words, the fan box knows who you are
   * even if the page it contains does not. These plugins therefore only need
   * to reload when the user signs in/out of facebook, not the application.
   *
   * This misses the case where the user switched logins without the
   * application knowing about it. Unfortunately this is not possible/allowed.
   */
  _setupAuthRefresh: function() {
    FB.getLoginStatus(FB.bind(function(response) {
      var lastStatus = response.status;
      FB.Event.subscribe('auth.statusChange', FB.bind(function(response) {
        if (!this.isValid()) {
          return;
        }
        // if we gained or lost a user, reprocess
        if (lastStatus == 'unknown' || response.status == 'unknown') {
          this.process(true);
        }
        lastStatus = response.status;
      }, this));
    }, this));
  },

  /**
   * Invoked by the iframe when it wants to be resized.
   */
  _handleResizeMsg: function(message) {
    if (!this.isValid()) {
      return;
    }
    var iframe = this.getIframeNode();
    iframe.style.height = message.height + 'px';
    if (message.width) {
      iframe.style.width = message.width + 'px';
    }
    iframe.style.border = 'none';
    this._makeVisible();
  },

  /**
   * Add the loader.
   */
  _addLoader: function() {
    if (!this._loaderDiv) {
      FB.Dom.addCss(this.dom, 'fb_iframe_widget_loader');
      this._loaderDiv = document.createElement('div');
      this._loaderDiv.className = 'FB_Loader';
      this.dom.appendChild(this._loaderDiv);
    }
  },

  /**
   * Remove the loader.
   */
  _removeLoader: function() {
    if (this._loaderDiv) {
      FB.Dom.removeCss(this.dom, 'fb_iframe_widget_loader');
      if (this._loaderDiv.parentNode) {
        this._loaderDiv.parentNode.removeChild(this._loaderDiv);
      }
      this._loaderDiv = null;
    }
  },

  /**
   * Get's the final QS/Post Data for the iframe with automatic params added
   * in.
   *
   * @return {Object} the params object
   */
  _getQS: function() {
    return FB.copy({
      api_key     : FB._apiKey,
      locale      : FB._locale,
      sdk         : 'joey',
      session_key : FB._session && FB._session.session_key
    }, this.getUrlBits().params);
  },

  /**
   * Gets the final URL based on the name specified in the bits.
   *
   * @return {String} the url
   */
  _getURL: function() {
    return FB._domain.www + 'plugins/' + this.getUrlBits().name + '.php';
  },

  /**
   * Will do the POST request to the iframe.
   */
  _postRequest: function() {
    FB.Content.postTarget({
      url    : this._getURL(),
      target : this.getIframeNode().name,
      params : this._getQS()
    });
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.buttonelement
 * @layer xfbml
 * @requires fb.type fb.xfbml.element fb.css.button fb.string
 */

/**
 * Base class for a button element.
 *
 * @class FB.XFBML.ButtonElement
 * @extends  FB.XFBML.Element
 * @private
 */
FB.subclass('XFBML.ButtonElement', 'XFBML.Element', null, {
  _allowedSizes: ['icon', 'small', 'medium', 'large', 'xlarge'],

  /////////////////////////////////////////////////////////////////////////////
  // Methods the implementation MUST override
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Invoked when the button is clicked.
   */
  onClick: function() {
    throw new Error('Inheriting class needs to implement onClick().');
  },

  /////////////////////////////////////////////////////////////////////////////
  // Methods the implementation CAN override
  /////////////////////////////////////////////////////////////////////////////

  /**
   * This method is invoked before any processing is done to do any initial
   * setup and do any necessary validation on the attributes. A return value of
   * false will indicate that validation was unsuccessful and processing will
   * be halted. If you are going to return false and halt processing, you
   * should ensure you use FB.log() to output a short informative message
   * before doing so.
   *
   * @return {Boolean} true to continue processing, false to halt it
   */
  setupAndValidate: function() {
    return true;
  },

  /**
   * Should return the button markup. The default behaviour is to return the
   * original innerHTML of the element.
   *
   * @return {String} the HTML markup for the button
   */
  getButtonMarkup: function() {
    return this.getOriginalHTML();
  },

  /////////////////////////////////////////////////////////////////////////////
  // Public methods the implementation CAN use
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Get the original innerHTML of the element.
   *
   * @return {String} the original innerHTML
   */
  getOriginalHTML: function() {
    return this._originalHTML;
  },

  /////////////////////////////////////////////////////////////////////////////
  // Private methods the implementation MUST NOT use or override
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Processes this tag.
   */
  process: function() {
    if (!('_originalHTML' in this)) {
      this._originalHTML = FB.String.trim(this.dom.innerHTML);
    }

    if (!this.setupAndValidate()) {
      // failure to validate means we're done rendering what we can
      this.fire('render');
      return;
    }

    var
      size = this._getAttributeFromList('size', 'medium', this._allowedSizes),
      className = '',
      markup    = '';

    if (size == 'icon') {
      className = 'fb_button_simple';
    } else {
      var rtl_suffix = FB._localeIsRtl ? '_rtl' : '';
      markup = this.getButtonMarkup();
      className = 'fb_button' + rtl_suffix + ' fb_button_' + size + rtl_suffix;
    }

    this.dom.innerHTML = (
      '<a class="' + className + '">' +
        '<span class="fb_button_text">' + markup + '</span>' +
      '</a>'
    );

    // the firstChild is the anchor tag we just setup above
    this.dom.firstChild.onclick = FB.bind(this.onClick, this);

    this.fire('render');
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.edgewidget
 * @layer xfbml
 * @requires fb.type
 *           fb.dom
 *           fb.event
 *           fb.helper
 *           fb.xfbml.iframewidget
 *           fb.xfbml.edgecommentwidget
 */

/**
 * Base implementation for Edge Widgets.
 *
 * @class FB.XFBML.EdgeWidget
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.EdgeWidget', 'XFBML.IframeWidget', null, {
  /**
   * Make the iframe visible only when it has finished loading.
   */
  _visibleAfter: 'immediate',
  _showLoader: false,

  /**
   * Do initial attribute processing.
   */
  setupAndValidate : function() {
    FB.Dom.addCss(this.dom, 'fb_edge_widget_with_comment');
    this._attr = {
      channel_url      : this.getChannelUrl(),
      debug            : this._getBoolAttribute('debug'),
      href             : this.getAttribute('href', window.location.href),
      is_permalink     : this._getBoolAttribute('is-permalink'),
      node_type        : this.getAttribute('node-type', 'link'),
      width            : this._getWidgetWidth(),
      font             : this.getAttribute('font'),
      layout           : this._getLayout(),
      colorscheme      : this.getAttribute('color-scheme'),
      action           : this.getAttribute('action'),
      show_faces       : this._shouldShowFaces(),
      no_resize        : this._getBoolAttribute('no_resize')
    };

    return true;
  },

  // TODO(jcain): update so that master iframe controls everything,
  // including commenting
  oneTimeSetup : function() {
    // for now, showing the comment dialog also implies the user created an
    // edge to the thing, so we alias it.
    this.subscribe('xd.presentEdgeCommentDialog',
                   FB.bind(this._onEdgeCreate, this));
    this.subscribe('xd.presentEdgeCommentDialog',
                   FB.bind(this._handleEdgeCommentDialogPresentation, this));
    this.subscribe('xd.dismissEdgeCommentDialog',
                   FB.bind(this._handleEdgeCommentDialogDismissal, this));
    this.subscribe('xd.hideEdgeCommentDialog',
                   FB.bind(this._handleEdgeCommentDialogHide, this));
    this.subscribe('xd.showEdgeCommentDialog',
                   FB.bind(this._handleEdgeCommentDialogShow, this));

  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return {
      width: this._getWidgetWidth(),
      height: this._getWidgetHeight()
    };
  },

  /**
   * Returns the height of the widget iframe, taking into
   * account the chosen layout, a user-supplied height, and
   * the min and max values we'll allow.  As it turns out, we
   * don't see too much.  (At the moment, we ignore the any
   * user-defined height, but that might change.)
   *
   * This logic is replicated in html/plugins/like.php and
   * lib/external_node/param_validation.php, and must be replicated
   * because it helps size the client's iframe.
   *
   * @return {String} the CSS-legitimate width in pixels, as
   *         with '460px'.
   */
  _getWidgetHeight : function() {
    var layout = this._getLayout();
    var should_show_faces = this._shouldShowFaces() ? 'show' : 'hide';
    var layoutToDefaultHeightMap =
      { 'standard' : {'show': 80, 'hide': 35},
        'bar' : {'show': 45 , 'hide': 35},
        'button_count' : {'show': 21, 'hide': 21}};
    return layoutToDefaultHeightMap[layout][should_show_faces];
  },

  /**
   * Returns the width of the widget iframe, taking into
   * account the chosen layout, the user supplied width, and
   * the min and max values we'll allow.  There is much more
   * flexibility in how wide the widget is, so a user-supplied
   * width just needs to fall within a certain range.
   *
   * This logic is replicated in html/plugins/like.php and
   * lib/external_node/param_validation.php, and must be replicated
   * because it helps size the client's iframe.
   *
   * @return {String} the CSS-legitimate width in pixels, as
   *         with '460px'.
   */
  _getWidgetWidth : function() {
    var layout = this._getLayout();
    var should_show_faces = this._shouldShowFaces() ? 'show' : 'hide';
    var button_count_default_width =
      this.getAttribute('action') === 'recommend' ? 130 : 90;
    var layoutToDefaultWidthMap =
      { 'standard': {'show': 450,
                     'hide': 450},
        'bar': {'show': 700,
                'hide': 450},
        'button_count': {'show': button_count_default_width,
                         'hide': button_count_default_width}};
    var defaultWidth = layoutToDefaultWidthMap[layout][should_show_faces];
    var width = this._getPxAttribute('width', defaultWidth)

    var allowedWidths =
      { 'bar' : {'min' : 600, 'max' : 900 },
        'standard' : {'min' : 225, 'max' : 900},
        'button_count' : {'min' : button_count_default_width,
                          'max' : 900}};
    if (width < allowedWidths[layout].min) {
      width = allowedWidths[layout].min;
    } else if (width > allowedWidths[layout].max) {
      width = allowedWidths[layout].max;
    }

    return width;
  },

  /**
   * Returns the layout provided by the user, which can be
   * any one of 'standard', 'box', or 'bar'.  If the user
   * omits a layout, or if they layout they specify is invalid,
   * then we just go with 'standard'.
   *
   * This logic is replicated in html/plugins/like.php and
   * lib/external_node/param_validation.php, and must be replicated
   * because it helps size the client's iframe.
   *
   * @return {String} the layout of the Connect Widget.
   */
  _getLayout : function() {
    return this._getAttributeFromList('layout',
                                      'standard',
                                      ['standard', 'bar', 'button_count']);
  },

  /**
   * Returns true if and only if we should be showing faces in the
   * widget, and false otherwise.
   *
   * This logic is replicated in html/plugins/like.php and
   * lib/external_node/param_validation.php, and must be replicated
   * because it helps size the client's iframe.
   *
   * @return {String} described above.
   */
  _shouldShowFaces : function() {
    return this._getLayout() !== 'button_count' &&
           this._getBoolAttribute('show-faces', true);
  },

  /**
   * Handles the event fired when the user actually connects to
   * something.  The idea is to tell the host to drop in
   * another iframe widget--an FB.XFBML.EdgeCommentWidget--
   * and sensibly position it so it partially overlays
   * the mother widget.
   *
   * @param {Object} message a dictionary of information about the
   *        event.
   * @return void
   */
  _handleEdgeCommentDialogPresentation : function(message) {
    if (!this.isValid()) {
      return;
    }

    var comment_node = document.createElement('span');
    var opts = {
      commentNode : comment_node,
      externalUrl : message.externalURL,
      width : 330,
      height : 200,
      masterFrameName : message.masterFrameName,
      relativeHeightOffset : '26px'
    };

    this._commentSlave = new FB.XFBML.EdgeCommentWidget(opts);
    this.dom.appendChild(comment_node);
    this._commentSlave.process();
    this._commentWidgetNode = comment_node;
  },

  /**
   * Handles the XD event instructing the host to
   * remove the comment widget iframe.  The DOM node
   * for this widget is currently carrying just one child
   * node, which is the span representing the iframe.
   * We just need to return that one child in order for the
   * comment widget to disappear.
   *
   * @param {Object} message a dictionary of information about
   *        the event.
   * @return void
   */
  _handleEdgeCommentDialogDismissal : function(message) {
    if (this._commentWidgetNode) {
      this.dom.removeChild(this._commentWidgetNode);
      delete this._commentWidgetNode;
    }
  },

  /**
   * Handles the XD event instructing the hose to hide the comment
   * widget iframe.
   */
  _handleEdgeCommentDialogHide: function() {
    if (this._commentWidgetNode) {
      this._commentWidgetNode.style.display="none";
    }
  },

  /**
   * Handles the XD event instructing the hose to show the comment
   * widget iframe.
   */
  _handleEdgeCommentDialogShow: function() {
    if (this._commentWidgetNode) {
      this._commentWidgetNode.style.display="block";
    }
  },

  /**
   * Invoked when the user likes/recommends/whatever the thing to create an
   * edge.
   */
  _onEdgeCreate: function() {
    this.fire('edge.create', this._attr.href); // dynamically attached
    FB.Event.fire('edge.create', this._attr.href, this); // global
    FB.Helper.invokeHandler(
      this.getAttribute('on-create'), this, [this._attr.href]); // inline
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.activity
 * @layer xfbml
 * @requires fb.type fb.xfbml.iframewidget
 */

/**
 * Implementation for fb:activity tag.
 *
 * @class FB.XFBML.Activity
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.Activity', 'XFBML.IframeWidget', null, {
  _visibleAfter: 'load',

  /**
   * Refresh the iframe on auth.statusChange events.
   */
  _refreshOnAuthChange: true,

  /**
   * Do initial attribute processing.
   */
  setupAndValidate: function() {
    this._attr = {
      border_color    : this.getAttribute('border-color'),
      colorscheme     : this.getAttribute('color-scheme'),
      font            : this.getAttribute('font'),
      header          : this._getBoolAttribute('header'),
      height          : this._getPxAttribute('height', 300),
      recommendations : this._getBoolAttribute('recommendations'),
      site            : this.getAttribute('site', location.hostname),
      width           : this._getPxAttribute('width', 300)
    };

    return true;
  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return { width: this._attr.width, height: this._attr.height };
  },

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    return { name: 'activity', params: this._attr };
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.comments
 * @layer xfbml
 * @requires fb.type fb.xfbml.iframewidget fb.auth
 */

/**
 * Implementation for fb:comments tag.
 *
 * @class FB.XFBML.Comments
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.Comments', 'XFBML.IframeWidget', null, {
  /**
   * Make the iframe visible only when we get the initial resize message.
   */
  _visibleAfter: 'resize',

  /**
   * Refresh the iframe on auth.statusChange events.
   */
  _refreshOnAuthChange: true,

  /**
   * Do initial attribute processing.
   */
  setupAndValidate: function() {
    // query parameters to the comments iframe
    var attr = {
      channel_url : this.getChannelUrl(),
      css         : this.getAttribute('css'),
      notify      : this.getAttribute('notify'),
      numposts    : this.getAttribute('num-posts', 10),
      quiet       : this.getAttribute('quiet'),
      reverse     : this.getAttribute('reverse'),
      simple      : this.getAttribute('simple'),
      title       : this.getAttribute('title', document.title),
      url         : this.getAttribute('url', document.URL),
      width       : this._getPxAttribute('width', 550),
      xid         : this.getAttribute('xid')
    };

    // default xid to current URL
    if (!attr.xid) {
      // We always want the URL minus the hash "#" also note the encoding here
      // and down below when the url is built. This is intentional, so the
      // string received by the server is url-encoded and thus valid.
      var index = document.URL.indexOf('#');
      if (index > 0) {
        attr.xid = encodeURIComponent(document.URL.substring(0, index));
      }
      else {
        attr.xid = encodeURIComponent(document.URL);
      }
    }
    this._attr = attr;
    return true;
  },

  /**
   * Setup event handlers.
   */
  oneTimeSetup: function() {
    this.subscribe('xd.addComment', FB.bind(this._handleCommentMsg, this));
  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return { width: this._attr.width, height: 200 };
  },

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    return { name: 'comments', params: this._attr };
  },

  /**
   * Invoked by the iframe when a comment is added. Note, this feature needs to
   * be enabled by specifying the notify=true attribute on the tag. This is in
   * order to improve performance by only requiring this overhead when a
   * developer explicitly said they want it.
   *
   * @param message {Object} the message received via XD
   */
  _handleCommentMsg: function(message) {
    //TODO (naitik) what should we be giving the developers here? is there a
    //              comment_id they can get?
    if (!this.isValid()) {
      return;
    }
    FB.Event.fire('comments.add', {
      post: message.post,
      user: message.user,
      widget: this
    });
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.fan
 * @layer xfbml
 * @requires fb.type fb.xfbml.iframewidget
 */

/**
 * Implementation for fb:fan tag.
 *
 * @class FB.XFBML.Fan
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.Fan', 'XFBML.IframeWidget', null, {
  _visibleAfter: 'load',

  /**
   * Do initial attribute processing.
   */
  setupAndValidate: function() {
    this._attr = {
      api_key     : FB._apiKey,
      connections : this.getAttribute('connections', '10'),
      css         : this.getAttribute('css'),
      height      : this._getPxAttribute('height'),
      id          : this.getAttribute('profile-id'),
      logobar     : this._getBoolAttribute('logo-bar'),
      name        : this.getAttribute('name'),
      stream      : this._getBoolAttribute('stream', true),
      width       : this._getPxAttribute('width', 300)
    };

    // "id" or "name" is required
    if (!this._attr.id && !this._attr.name) {
      FB.log('<fb:fan> requires one of the "id" or "name" attributes.');
      return false;
    }

    var height = this._attr.height;
    if (!height) {
      if ((!this._attr.connections || this._attr.connections === '0') &&
          !this._attr.stream) {
        height = 65;
      } else if (!this._attr.connections || this._attr.connections === '0') {
        height = 375;
      } else if (!this._attr.stream) {
        height = 250;
      } else {
        height = 550;
      }
    }
    // add space for logobar
    if (this._attr.logobar) {
      height += 25;
    }

    this._attr.height = height;
    return true;
  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return { width: this._attr.width, height: this._attr.height };
  },

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    return { name: 'fan', params: this._attr };
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.like
 * @layer xfbml
 * @requires fb.type fb.xfbml.edgewidget
 */

/**
 * Implementation for fb:like tag.
 *
 * @class FB.XFBML.Like
 * @extends FB.XFBML.EdgeWidget
 * @private
 */
FB.subclass('XFBML.Like', 'XFBML.EdgeWidget', null, {

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    return { name: 'like', params: this._attr };
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.livestream
 * @layer xfbml
 * @requires fb.type fb.xfbml.iframewidget
 */

/**
 * Implementation for fb:live-stream tag.
 *
 * @class FB.XFBML.LiveStream
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.LiveStream', 'XFBML.IframeWidget', null, {
  _visibleAfter: 'load',

  /**
   * Do initial attribute processing.
   */
  setupAndValidate: function() {
    this._attr = {
      height                 : this._getPxAttribute('height', 500),
      hideFriendsTab         : this.getAttribute('hide-friends-tab'),
      redesigned             : this._getBoolAttribute('redesigned-stream'),
      width                  : this._getPxAttribute('width', 400),
      xid                    : this.getAttribute('xid', 'default'),
      always_post_to_friends : this._getBoolAttribute('always-post-to-friends',
                                                      false)
    };

    return true;
  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return { width: this._attr.width, height: this._attr.height };
  },

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    var name = this._attr.redesigned ? 'live_stream_box' : 'livefeed';
    return { name: name, params: this._attr };
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.loginbutton
 * @layer xfbml
 * @requires fb.type
 *           fb.intl
 *           fb.xfbml.buttonelement
 *           fb.helper
 *           fb.auth
 */

/**
 * Implementation for fb:login-button tag.
 *
 * @class FB.XFBML.LoginButton
 * @extends  FB.XFBML.ButtonElement
 * @private
 */
FB.subclass('XFBML.LoginButton', 'XFBML.ButtonElement', null, {
  /**
   * Do initial attribute processing.
   *
   * @return {Boolean} true to continue processing, false to halt it
   */
  setupAndValidate: function() {
    this.autologoutlink = this._getBoolAttribute('auto-logout-link');
    this.onlogin = this.getAttribute('on-login');
    this.perms = this.getAttribute('perms');
    this.length = this._getAttributeFromList(
      'length',         // name
      'short',          // defaultValue
      ['long', 'short'] // allowed
    );
    this.iframe = this._getBoolAttribute('iframe');

    if (this.autologoutlink) {
      FB.Event.subscribe('auth.statusChange', FB.bind(this.process, this));
    }

    return true;
  },

  /**
   * Should return the button markup. The default behaviour is to return the
   * original innerHTML of the element.
   *
   * @return {String} the HTML markup for the button
   */
  getButtonMarkup: function() {
    var originalHTML = this.getOriginalHTML();
    if (originalHTML === '') {
      if (FB.getSession() && this.autologoutlink) {
        return FB.Intl.tx('cs:logout');
      } else {
        return this.length == 'short'
          ? FB.Intl.tx('cs:connect')
          : FB.Intl.tx('cs:connect-with-facebook');
      }
    } else {
      return originalHTML;
    }
  },

  /**
   * The ButtonElement base class will invoke this when the button is clicked.
   */
  onClick: function() {
    if (!FB.getSession() || !this.autologoutlink) {
      FB.login(FB.bind(this._authCallback, this), { perms: this.perms });
    } else {
      FB.logout(FB.bind(this._authCallback, this));
    }
  },

  /**
   * This will be invoked with the result of the FB.login() or FB.logout() to
   * pass the result to the developer specified callback if any.
   *
   * @param response {Object} the auth response object
   */
  _authCallback: function(response) {
    FB.Helper.invokeHandler(this.onlogin, this, [response]);
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.name
 * @layer xfbml
 * @requires fb.type fb.xfbml  fb.dom fb.xfbml.element fb.data fb.helper
 */

/**
 * @class FB.XFBML.Name
 * @extends  FB.XFBML.Element
 * @private
 */
FB.subclass('XFBML.Name', 'XFBML.Element', null, {
  /**
   * Processes this tag.
   */
  process: function() {
    FB.copy(this, {
      _uid           : this.getAttribute('uid'),
      _firstnameonly : this._getBoolAttribute('first-name-only'),
      _lastnameonly  : this._getBoolAttribute('last-name-only'),
      _possessive    : this._getBoolAttribute('possessive'),
      _reflexive     : this._getBoolAttribute('reflexive'),
      _objective     : this._getBoolAttribute('objective'),
      _linked        : this._getBoolAttribute('linked', true),
      _subjectId     : this.getAttribute('subject-id')
    });

    if (!this._uid) {
      FB.log('"uid" is a required attribute for <fb:name>');
      this.fire('render');
      return;
    }

    var fields = [];
    if (this._firstnameonly) {
      fields.push('first_name');
    } else if (this._lastnameonly) {
      fields.push('last_name');
    } else {
      fields.push('name');
    }

    if (this._subjectId) {
      fields.push('sex');

      if (this._subjectId == FB.Helper.getLoggedInUser()) {
        this._reflexive = true;
      }
    }

    var data;
    // Wait for status to be known
    FB.Event.monitor('auth.statusChange', this.bind(function() {
      // Is Element still in DOM tree?
      if (!this.isValid()) {
        this.fire('render');
        return true; // Stop processing
      }

      if (FB._userStatus) {
        if (this._uid == 'loggedinuser') {
          this._uid = FB.Helper.getLoggedInUser();
        }

        if (FB.Helper.isUser(this._uid)) {
          data = FB.Data._selectByIndex(fields, 'user', 'uid', this._uid);
        } else {
          data = FB.Data._selectByIndex(['name', 'id'], 'profile', 'id',
                                        this._uid);
        }
        data.wait(this.bind(function(data) {
          if (this._uid) {
            if (this._subjectId == this._uid) {
              this._renderPronoun(data[0]);
            } else {
              this._renderOther(data[0]);
            }
          }
          this.fire('render');
        }));
      }
      return false;
    }));
  },

  /**
   * Given this name, figure out the proper (English) pronoun for it.
   */
  _renderPronoun: function(userInfo) {
    var
      word = '',
      objective = this._objective;
    if (this._subjectId) {
      objective = true;
      if (this._subjectId === this._uid) {
        this._reflexive = true;
      }
    }
    if (this._uid == FB.Connect.get_loggedInUser() &&
        this._getBoolAttribute('use-you', true)) {
      if (this._possessive) {
        if (this._reflexive) {
          word = 'your own';
        } else {
          word = 'your';
        }
      } else {
        if (this._reflexive) {
          word = 'yourself';
        } else {
          word = 'you';
        }
      }
    }
    else {
      switch (userInfo.sex) {
        case 'male':
          if (this._possessive) {
            word = this._reflexive ? 'his own' : 'his';
          } else {
            if (this._reflexive) {
              word = 'himself';
            } else if (objective) {
              word = 'him';
            } else {
              word = 'he';
            }
          }
          break;
        case 'female':
          if (this._possessive) {
            word = this._reflexive ? 'her own' : 'her';
          } else {
            if (this._reflexive) {
              word = 'herself';
            } else if (objective) {
              word = 'her';
            } else {
              word = 'she';
            }
          }
          break;
        default:
          if (this._getBoolAttribute('use-they', true)) {
            if (this._possessive) {
              if (this._reflexive) {
                word = 'their own';
              } else {
                word = 'their';
              }
            } else {
              if (this._reflexive) {
                word = 'themselves';
              } else if (objective) {
                word = 'them';
              } else {
                word = 'they';
              }
            }
          }
          else {
            if (this._possessive) {
              if (this._reflexive) {
                word = 'his/her own';
              } else {
                word = 'his/her';
              }
            } else {
              if (this._reflexive) {
                word = 'himself/herself';
              } else if (objective) {
                word = 'him/her';
              } else {
                word = 'he/she';
              }
            }
          }
          break;
      }
    }
    if (this._getBoolAttribute('capitalize', false)) {
      word = FB.Helper.upperCaseFirstChar(word);
    }
    this.dom.innerHTML = word;
  },

  /**
   * Handle rendering of the element, using the
   * metadata that came with it.
   */
  _renderOther: function(userInfo) {
    if (!userInfo) {
      return;
    }
    var
      name = '',
      html = '';
    if (this._uid == FB.Helper.getLoggedInUser() &&
        this._getBoolAttribute('use-you', true)) {
      if (this._reflexive) {
        if (this._possessive) {
          name = 'your own';
        } else {
          name = 'yourself';
        }
      } else {
        //  The possessive works really nicely this way!
        if (this._possessive) {
          name = 'your';
        } else {
          name = 'you';
        }
      }
    }
    else {
      //  FQLCantSee structures will show as null.
      if (null === userInfo.first_name) {
        userInfo.first_name = '';
      }
      if (null === userInfo.last_name) {
        userInfo.last_name = '';
      }
      if (this._firstnameonly) {
        name = userInfo.first_name;
      } else if (this._lastnameonly) {
        name = userInfo.last_name;
      }

      if (!name) {
        name = userInfo.name;
      }

      if (name !== '' && this._possessive) {
        name += '\'s';
      }
    }

    if (!name) {
      name = this.getAttribute('if-cant-see', 'Facebook User');
    }
    if (name) {
      if (this._getBoolAttribute('capitalize', false)) {
        name = FB.Helper.upperCaseFirstChar(name);
      }
      if (this._linked) {
        html = FB.Helper.getProfileLink(userInfo, name,
          this.getAttribute('href', null));
      } else {
        html = name;
      }
    }
    this.dom.innerHTML = html;
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.profilepic
 * @layer xfbml
 * @requires fb.type fb.xfbml fb.string fb.dom fb.xfbml.element fb.data
 *           fb.helper
 */

/**
 * @class FB.XFBML.ProfilePic
 * @extends  FB.XFBML.Element
 * @private
 */
FB.subclass('XFBML.ProfilePic', 'XFBML.Element', null, {
  /**
   * Processes this tag.
   */
  process: function() {
    var
      size = this.getAttribute('size', 'thumb'),
      picFieldName = FB.XFBML.ProfilePic._sizeToPicFieldMap[size],
      width = this._getPxAttribute('width'),
      height = this._getPxAttribute('height'),
      style = this.dom.style,
      uid = this.getAttribute('uid');

    // Check if we need to add facebook logo image
    if (this._getBoolAttribute('facebook-logo')) {
      picFieldName += '_with_logo';
    }

    if (width) {
      width = width + 'px';
      style.width = width;
    }
    if (height) {
      height = height + 'px';
      style.height = height;
    }

    var renderFn = this.bind(function(result) {
      var
        userInfo = result ? result[0] : null,
        imgSrc = userInfo ? userInfo[picFieldName] : null;

      if (!imgSrc) {
        // Create default
        imgSrc = FB._domain.cdn + FB.XFBML.ProfilePic._defPicMap[picFieldName];
      }
      // Copy width, height style, and class name of fb:profile-pic down to the
      // image element we create
      var
        styleValue = (
          (width ? 'width:' + width + ';' : '') +
          (height ? 'height:' + width + ';' : '')
        ),
        html = FB.String.format(
          '<img src="{0}" alt="{1}" title="{1}" style="{2}" class="{3}" />',
          imgSrc,
          userInfo ? userInfo.name : '',
          styleValue,
          this.dom.className
        );

      if (this._getBoolAttribute('linked', true)) {
        html = FB.Helper.getProfileLink(
          userInfo,
          html,
          this.getAttribute('href', null)
        );
      }
      this.dom.innerHTML = html;
      FB.Dom.addCss(this.dom, 'fb_profile_pic_rendered');
      this.fire('render');
    });

    // Wait for status to be known
    FB.Event.monitor('auth.statusChange', this.bind(function() {
      //Is Element still in DOM tree
      if (!this.isValid()) {
        this.fire('render');
        return true; // Stop processing
      }

      if (this.getAttribute('uid', null) == 'loggedinuser') {
        uid = FB.Helper.getLoggedInUser();
      }

      // Is status known?
      if (FB._userStatus && uid) {
        // Get data
        // Use profile if uid is a user, but a page
        FB.Data._selectByIndex(
          ['name', picFieldName],
          FB.Helper.isUser(uid) ? 'user' : 'profile',
          FB.Helper.isUser(uid) ? 'uid' : 'id',
          uid
        ).wait(renderFn);
      } else {
        // Render default
        renderFn();
      }
    }));
  }
});

FB.provide('XFBML.ProfilePic', {
  /**
   * Maps field type to placeholder/silhouette image.
   *
   * This dynamic data is replaced with rsrc.php backed URLs by Haste.
   */
  _defPicMap: {
    pic                  : 'pics/s_silhouette.jpg',
    pic_big              : 'pics/d_silhouette.gif',
    pic_big_with_logo    : 'pics/d_silhouette_logo.gif',
    pic_small            : 'pics/t_silhouette.jpg',
    pic_small_with_logo  : 'pics/t_silhouette_logo.gif',
    pic_square           : 'pics/q_silhouette.gif',
    pic_square_with_logo : 'pics/q_silhouette_logo.gif',
    pic_with_logo        : 'pics/s_silhouette_logo.gif'
  },

  /**
   * Maps user specified attribute for size to a field type.
   */
  _sizeToPicFieldMap: {
    n      : 'pic_big',
    normal : 'pic_big',
    q      : 'pic_square',
    s      : 'pic',
    small  : 'pic',
    square : 'pic_square',
    t      : 'pic_small',
    thumb  : 'pic_small'
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.recommendations
 * @layer xfbml
 * @requires fb.type fb.xfbml.iframewidget
 */

/**
 * Implementation for fb:recommendations tag.
 *
 * @class FB.XFBML.Recommendations
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.Recommendations', 'XFBML.IframeWidget', null, {
  _visibleAfter: 'load',

  /**
   * Refresh the iframe on auth.statusChange events.
   */
  _refreshOnAuthChange: true,


  /**
   * Do initial attribute processing.
   */
  setupAndValidate: function() {
    this._attr = {
      border_color : this.getAttribute('border-color'),
      colorscheme  : this.getAttribute('color-scheme'),
      font         : this.getAttribute('font'),
      header       : this._getBoolAttribute('header'),
      height       : this._getPxAttribute('height', 300),
      site         : this.getAttribute('site', location.hostname),
      width        : this._getPxAttribute('width', 300)
    };

    return true;
  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return { width: this._attr.width, height: this._attr.height };
  },

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    return { name: 'recommendations', params: this._attr };
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.serverfbml
 * @layer xfbml
 * @requires fb.type fb.content fb.xfbml.iframewidget fb.auth
 */

/**
 * Implementation for fb:serverfbml tag.
 *
 * @class FB.XFBML.ServerFbml
 * @extends FB.XFBML.IframeWidget
 * @private
 */
FB.subclass('XFBML.ServerFbml', 'XFBML.IframeWidget', null, {
  /**
   * Make the iframe visible only when we get the initial resize message.
   */
  _visibleAfter: 'resize',

  /**
   * Do initial attribute processing.
   */
  setupAndValidate: function() {
    // query parameters to the comments iframe
    this._attr = {
      channel_url : this.getChannelUrl(),
      fbml        : this.getAttribute('fbml'),
      width       : this._getPxAttribute('width')
    };

    // fbml may also be specified as a child script tag
    if (!this._attr.fbml) {
      var child = this.dom.getElementsByTagName('script')[0];
      if (child && child.type === 'text/fbml') {
        this._attr.fbml = child.innerHTML;
      }
    }

    // if still no fbml, error
    if (!this._attr.fbml) {
      FB.log('<fb:serverfbml> requires the "fbml" attribute.');
      return false;
    }

    return true;
  },

  /**
   * Get the initial size.
   *
   * @return {Object} the size
   */
  getSize: function() {
    return { width: this._attr.width, height: this._attr.height };
  },

  /**
   * Get the URL bits for the iframe.
   *
   * @return {Object} the iframe URL bits
   */
  getUrlBits: function() {
    return { name: 'serverfbml', params: this._attr };
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.xfbml.sharebutton
 * @layer xfbml
 * @requires fb.type
 *           fb.intl
 *           fb.xfbml
 *           fb.string
 *           fb.dom
 *           fb.xfbml.element
 *           fb.ui
 *           fb.data
 *           fb.helper
 *           fb.css.sharebutton
 */

/**
 * Implementation for fb:share-button tag.
 * @class FB.XFBML.ShareButton
 * @extends  FB.XFBML.Element
 * @private
 */
FB.subclass('XFBML.ShareButton', 'XFBML.Element', null, {
  /**
   * Processes this tag.
   */
  process: function() {
    this._href = this.getAttribute('href', window.location.href);

    //TODO: When we turn sharepro on, replace icon_link with button_count
    this._type = this.getAttribute('type', 'icon_link');

    this._renderButton(true);
  },

  /**
   * Render's the button.
   *
   * @access private
   * @param skipRenderEvent {Boolean} indicate if firing of the render event
   * should be skipped. This is useful because the _renderButton() function may
   * recursively call itself to do the final render, which is when we want to
   * fire the render event.
   */
  _renderButton: function(skipRenderEvent) {
    if (!this.isValid()) {
      this.fire('render');
      return;
    }

    var
      contentStr = '',
      post = '',
      pre = '',
      classStr = '',
      share = FB.Intl.tx('sh:share-button'),
      wrapperClass = '';

    switch (this._type) {
    case 'icon':
    case 'icon_link':
      classStr = 'fb_button_simple';
      contentStr = (
        '<span class="fb_button_text">' +
          (this._type == 'icon_link' ? share : '&nbsp;') +
        '</span>'
      );
      skipRenderEvent = false;
      break;
    case 'link':
      contentStr = FB.Intl.tx('cs:share-on-facebook');
      skipRenderEvent = false;
      break;
    case 'button':
      contentStr = '<span class="fb_button_text">' + share +  '</span>';
      classStr = 'fb_button fb_button_small';
      skipRenderEvent = false;
      break;
    case 'button_count':
      contentStr = '<span class="fb_button_text">' + share +  '</span>';
      post = (
        '<span class="fb_share_count_nub_right">&nbsp;</span>' +
        '<span class="fb_share_count fb_share_count_right">'+
          this._getCounterMarkup() +
        '</span>'
      );
      classStr = 'fb_button fb_button_small';
      break;
    default:
      // box count
      contentStr = '<span class="fb_button_text">' + share +  '</span>';
      pre = (
        '<span class="fb_share_count_nub_top">&nbsp;</span>' +
        '<span class="fb_share_count fb_share_count_top">' +
          this._getCounterMarkup() +
        '</span>'
      );
      classStr = 'fb_button fb_button_small';
      wrapperClass = 'fb_share_count_wrapper';
    }
    this.dom.innerHTML = FB.String.format(
      '<span class="{0}">{4}<a href="{1}" class="{2}" ' +
      'onclick=\'FB.ui({6});return false;\'' +
      'target="_blank">{3}</a>{5}</span>',
      wrapperClass,
      this._href,
      classStr,
      contentStr,
      pre,
      post,
      FB.JSON.stringify({ method: 'stream.share', u: this._href })
    );

    if (!skipRenderEvent) {
      this.fire('render');
    }
  },

  _getCounterMarkup: function() {
    if (!this._count) {
      this._count = FB.Data._selectByIndex(
        ['total_count'],
        'link_stat',
        'url',
        this._href
      );
    }

    if (this._count.value !== undefined) {
      if (this._count.value.length > 0) {
        var c = this._count.value[0].total_count;
        if (c > 3) {
          var prettyCount = c >= 10000000 ? Math.round(c/1000000) + 'M' :
                            (c >= 10000 ? Math.round(c/1000) + 'K' : c);
          return (
            '<span class="fb_share_count_inner">' +
              prettyCount +
            '</span>'
          );
        }
      }
    } else {
      this._count.wait(FB.bind(this._renderButton, this, false));
    }

    return '';
  }
});
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @provides fb.intl.en_US
 * @requires fb.prelude
 */

/**
 * Provides the en_US version of the required strings for use by those choosing
 * to host the library themselves rather than use the one we serve.
 *
 * TODO (naitik) This is a temporary solution. In the long run, we should
 * provide the ability to generate this file for any locale using the API.
 *
 * Note: This file is not included in the version of the library served by
 * facebook.
 *
 * @class FB.Intl
 * @static
 * @access public
 */
FB.provide('FB.Intl', {
  _stringTable: {
    'sh:loading': 'Loading...',
    'sh:share-button': 'Share',
    'cs:share-on-facebook': 'Share on Facebook',
    'cs:connect': 'Connect',
    'cs:connect-with-facebook': 'Connect with Facebook',
    'cs:logout': 'Facebook Logout',
    'cs:bookmark-on-facebook': 'Bookmark on Facebook',
    'cs:add-profile-tab-on-facebook': 'Add Profile Tab on Facebook'
  }
});
FB.Dom.addCssRules("\/**\n * Copyright Facebook Inc.\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     http:\/\/www.apache.org\/licenses\/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n *\n *\n * Styles for the client side Dialogs.\n *\n * @author naitik\n * @provides fb.css.dialog\n * @requires fb.css.base fb.dom\n *\/\n\n.fb_dialog {\n  position: absolute;\n  top: -10000px;\n  z-index: 10001;\n}\n.fb_dialog_advanced {\n  background: rgba(82, 82, 82, 0.7);\n  padding: 10px;\n  -moz-border-radius: 8px;\n  -webkit-border-radius: 8px;\n}\n.fb_dialog_content {\n  background: #ffffff;\n  color: #333333;\n}\n.fb_dialog_close_icon {\n  background: url(http:\/\/static.ak.fbcdn.net\/images\/fbconnect\/connect_icon_remove.gif) no-repeat scroll 3px 0 transparent;\n  cursor: pointer;\n  display: block;\n  height: 16px;\n  position: absolute;\n  right: 19px;\n  top: 18px;\n  width: 14px;\n  \/* this rule applies to all IE browsers only because using the \\9 hack *\/\n  top: 10px\\9;\n  right: 7px\\9;\n}\n.fb_dialog_close_icon:hover {\n  background: url(http:\/\/static.ak.fbcdn.net\/images\/fbconnect\/connect_icon_remove.gif) no-repeat scroll -10px 0 transparent;\n}\n.fb_dialog_loader {\n  background-color: #f2f2f2;\n  border: 1px solid #606060;\n  font-size: 24px;\n  padding: 20px;\n}\n#fb_dialog_loader_close {\n  background: url(http:\/\/static.ak.fbcdn.net\/images\/sidebar\/close-off.gif) no-repeat scroll left top transparent;\n  cursor: pointer;\n  display: -moz-inline-block;\n  display: inline-block;\n  height: 9px;\n  margin-left: 20px;\n  position: relative;\n  vertical-align: middle;\n  width: 9px;\n}\n#fb_dialog_loader_close:hover {\n  background-image: url(http:\/\/static.ak.fbcdn.net\/images\/gigaboxx\/clear_search.png);\n}\n\n\n\/**\n * Rounded corners and borders with alpha transparency for older browsers.\n *\/\n.fb_dialog_top_left,\n.fb_dialog_top_right,\n.fb_dialog_bottom_left,\n.fb_dialog_bottom_right {\n  height: 10px;\n  width: 10px;\n  overflow: hidden;\n  position: absolute;\n}\n\/* @noflip *\/\n.fb_dialog_top_left {\n  background: url(http:\/\/static.ak.fbcdn.net\/imgs\/pop-dialog-sprite.png) no-repeat 0 0;\n  left: -10px;\n  top: -10px;\n}\n\/* @noflip *\/\n.fb_dialog_top_right {\n  background: url(http:\/\/static.ak.fbcdn.net\/imgs\/pop-dialog-sprite.png) no-repeat 0 -10px;\n  right: -10px;\n  top: -10px;\n}\n\/* @noflip *\/\n.fb_dialog_bottom_left {\n  background: url(http:\/\/static.ak.fbcdn.net\/imgs\/pop-dialog-sprite.png) no-repeat 0 -20px;\n  bottom: -10px;\n  left: -10px;\n}\n\/* @noflip *\/\n.fb_dialog_bottom_right {\n  background: url(http:\/\/static.ak.fbcdn.net\/imgs\/pop-dialog-sprite.png) no-repeat 0 -30px;\n  right: -10px;\n  bottom: -10px;\n}\n.fb_dialog_vert_left,\n.fb_dialog_vert_right,\n.fb_dialog_horiz_top,\n.fb_dialog_horiz_bottom {\n  position: absolute;\n  background: #525252;\n  filter: alpha(opacity=70);\n  opacity: .7;\n}\n.fb_dialog_vert_left,\n.fb_dialog_vert_right {\n  width: 10px;\n  height: 100%;\n}\n.fb_dialog_vert_left {\n  margin-left: -10px;\n}\n.fb_dialog_vert_right {\n  right: 0;\n  margin-right: -10px;\n}\n.fb_dialog_horiz_top,\n.fb_dialog_horiz_bottom {\n  width: 100%;\n  height: 10px;\n}\n.fb_dialog_horiz_top {\n  margin-top: -10px;\n}\n.fb_dialog_horiz_bottom {\n  bottom: 0;\n  margin-bottom: -10px;\n}\n\n\/* dialogs used for iframe need this to prevent potential whitespace from\n * showing because iframes are inline elements and not block level elements. *\/\n.fb_dialog_iframe {\n  line-height: 0;\n}\n\/**\n * Copyright Facebook Inc.\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     http:\/\/www.apache.org\/licenses\/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n *\n * @author blaise\n * @provides fb.css.button\n * @layer xfbml\n *\/\n\n\/**\n * simple buttons are very completely separate from the pretty buttons below.\n *\/\n.fb_button_simple,\n.fb_button_simple_rtl {\n  background-image: url(http:\/\/static.ak.fbcdn.net\/images\/connect_favicon.png);\n  background-repeat: no-repeat;\n  cursor: pointer;\n  outline: none;\n  text-decoration: none;\n}\n.fb_button_simple_rtl {\n background-position: right 0px;\n}\n\n.fb_button_simple .fb_button_text {\n  margin: 0 0 0px 20px;\n  padding-bottom: 1px;\n}\n\n.fb_button_simple_rtl .fb_button_text {\n  margin: 0px 10px 0px 0px;\n}\n\na.fb_button_simple:hover .fb_button_text,\na.fb_button_simple_rtl:hover .fb_button_text,\n.fb_button_simple:hover .fb_button_text,\n.fb_button_simple_rtl:hover .fb_button_text  {\n  text-decoration: underline;\n}\n\n\n\/**\n * these are the new style pretty buttons with various size options\n *\/\n.fb_button,\n.fb_button_rtl {\n  background: #29447e url(http:\/\/static.ak.fbcdn.net\/images\/connect_sprite.png);\n  background-repeat: no-repeat;\n  cursor: pointer;\n  display: inline-block;\n  padding: 0px 0px 0px 1px;\n  text-decoration: none;\n  outline: none;\n}\n\n.fb_button .fb_button_text,\n.fb_button_rtl .fb_button_text {\n  background: #5f78ab url(http:\/\/static.ak.fbcdn.net\/images\/connect_sprite.png);\n  border-top: solid 1px #879ac0;\n  border-bottom: solid 1px #1a356e;\n  color: white;\n  display: block;\n  font-family: \"lucida grande\",tahoma,verdana,arial,sans-serif;\n  font-weight: bold;\n  padding: 2px 6px 3px 6px;\n  margin: 1px 1px 0px 21px;\n  text-shadow: none;\n}\n\n\na.fb_button,\na.fb_button_rtl,\n.fb_button,\n.fb_button_rtl {\n  text-decoration: none;\n}\n\na.fb_button:active .fb_button_text,\na.fb_button_rtl:active .fb_button_text,\n.fb_button:active .fb_button_text,\n.fb_button_rtl:active .fb_button_text {\n  border-bottom: solid 1px #29447e;\n  border-top: solid 1px #45619d;\n  background: #4f6aa3;\n  text-shadow: none;\n}\n\n\n.fb_button_xlarge,\n.fb_button_xlarge_rtl {\n  background-position: left -60px;\n  font-size: 24px;\n  line-height: 30px;\n}\n.fb_button_xlarge .fb_button_text {\n  padding: 3px 8px 3px 12px;\n  margin-left: 38px;\n}\na.fb_button_xlarge:active {\n  background-position: left -99px;\n}\n.fb_button_xlarge_rtl {\n  background-position: right -268px;\n}\n.fb_button_xlarge_rtl .fb_button_text {\n  padding: 3px 8px 3px 12px;\n  margin-right: 39px;\n}\na.fb_button_xlarge_rtl:active {\n  background-position: right -307px;\n}\n\n.fb_button_large,\n.fb_button_large_rtl {\n  background-position: left -138px;\n  font-size: 13px;\n  line-height: 16px;\n}\n.fb_button_large .fb_button_text {\n  margin-left: 24px;\n  padding: 2px 6px 4px 6px;\n}\na.fb_button_large:active {\n  background-position: left -163px;\n}\n.fb_button_large_rtl {\n  background-position: right -346px;\n}\n.fb_button_large_rtl .fb_button_text {\n  margin-right: 25px;\n}\na.fb_button_large_rtl:active {\n  background-position: right -371px;\n}\n\n.fb_button_medium,\n.fb_button_medium_rtl  {\n  background-position: left -188px;\n  font-size: 11px;\n  line-height: 14px;\n}\na.fb_button_medium:active  {\n  background-position: left -210px;\n}\n\n.fb_button_medium_rtl  {\n  background-position: right -396px;\n}\n.fb_button_text_rtl,\n.fb_button_medium_rtl .fb_button_text {\n  padding: 2px 6px 3px 6px;\n  margin-right: 22px;\n}\na.fb_button_medium_rtl:active  {\n  background-position: right -418px;\n}\n\n.fb_button_small,\n.fb_button_small_rtl {\n  background-position: left -232px;\n  font-size: 10px;\n  line-height: 10px;\n}\n.fb_button_small .fb_button_text {\n  padding: 2px 6px 3px;\n  margin-left: 17px;\n}\na.fb_button_small:active,\n.fb_button_small:active {\n  background-position: left -250px;\n}\n\n.fb_button_small_rtl {\n  background-position: right -440px;\n}\n.fb_button_small_rtl .fb_button_text {\n  padding: 2px 6px;\n  margin-right: 18px;\n}\na.fb_button_small_rtl:active {\n  background-position: right -458px;\n}\n\/**\n * Copyright Facebook Inc.\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     http:\/\/www.apache.org\/licenses\/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n *\n * @author arunv\n * @provides fb.css.sharebutton\n * @layer xfbml\n * @requires fb.css.button\n *\/\n.fb_share_count_wrapper {\n  position: relative;\n  float: left;\n}\n\n.fb_share_count {\n  background: #b0b9ec none repeat scroll 0 0;\n  color: #333333;\n  font-family: \"lucida grande\", tahoma, verdana, arial, sans-serif;\n  text-align: center;\n}\n\n.fb_share_count_inner {\n  background: #e8ebf2;\n  display: block;\n}\n\n.fb_share_count_right {\n  margin-left: -1px;\n  display: inline-block;\n}\n\n.fb_share_count_right .fb_share_count_inner {\n  border-top: solid 1px #e8ebf2;\n  border-bottom: solid 1px #b0b9ec;\n  margin: 1px 1px 0px 1px;\n  font-size: 10px;\n  line-height: 10px;\n  padding: 2px 6px 3px;\n  font-weight: bold;\n}\n\n.fb_share_count_top {\n  display: block;\n  letter-spacing: -1px;\n  line-height: 34px;\n  margin-bottom: 7px;\n  font-size: 22px;\n  border: solid 1px #b0b9ec;\n}\n\n.fb_share_count_nub_top {\n  border: none;\n  display: block;\n  position: absolute;\n  left: 7px;\n  top: 35px;\n  margin: 0;\n  padding: 0;\n  width: 6px;\n  height: 7px;\n  background-repeat: no-repeat;\n  background-image: url(http:\/\/static.ak.fbcdn.net\/images\/sharepro\/sp_h_nub.png);\n}\n\n.fb_share_count_nub_right {\n  border: none;\n  display: inline-block;\n  padding: 0;\n  width: 5px;\n  height: 10px;\n  background-repeat: no-repeat;\n  background-image: url(http:\/\/static.ak.fbcdn.net\/images\/sharepro\/sp_v_nub.png);\n  vertical-align: top;\n  background-position:right 5px;\n  z-index: 10;\n  left: 2px;\n  margin: 0px 2px 0px 0px;\n  position: relative;\n}\n\n.fb_share_no_count {\n  display: none;\n}\n\n.fb_share_size_Small .fb_share_count_right .fb_share_count_inner {\n  font-size: 10px;\n}\n\n.fb_share_size_Medium .fb_share_count_right .fb_share_count_inner {\n  font-size: 11px;\n  padding: 2px 6px 3px;\n  letter-spacing: -1px;\n  line-height: 14px;\n}\n\n.fb_share_size_Large .fb_share_count_right .fb_share_count_inner {\n  font-size: 13px;\n  line-height: 16px;\n  padding: 2px 6px 4px;\n  font-weight: normal;\n  letter-spacing: -1px;\n}\n\/**\n * Copyright Facebook Inc.\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     http:\/\/www.apache.org\/licenses\/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n *\n * @author naitik\n * @provides fb.css.base\n *\/\n\n.fb_hidden {\n  position: absolute;\n  top: -10000px;\n  z-index: 10001;\n}\n\n.fb_reset {\n  background: none;\n  border-spacing: 0;\n  border: 0px;\n  color: #000;\n  cursor: auto;\n  direction: ltr;\n  font-family: \"lucida grande\", tahoma, verdana, arial, sans-serif;\n  font-size: 11px;\n  font-style: normal;\n  font-variant: normal;\n  font-weight: normal;\n  letter-spacing: normal;\n  line-height: 1;\n  margin: 0;\n  overflow: visible;\n  padding: 0;\n  text-align: left;\n  text-decoration: none;\n  text-indent: 0;\n  text-shadow: none;\n  text-transform: none;\n  visibility: visible;\n  white-space: normal;\n  word-spacing: normal;\n}\n\n.fb_link img {\n  border: none;\n}\n\/**\n * Copyright Facebook Inc.\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     http:\/\/www.apache.org\/licenses\/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n *\n * @author naitik\n * @provides fb.css.iframewidget\n * @layer xfbml\n *\/\n.fb_iframe_widget {\n  position: relative;\n  display: -moz-inline-block; \/* ff2 *\/\n  display: inline-block;\n}\n.fb_iframe_widget iframe {\n  \/* this is necessary for IE. without it, once hidden, it wont become visible\n   * again *\/\n  position: relative;\n  \/* this is to remove the bottom margin appearing on the iframe widgets *\/\n  vertical-align: text-bottom;\n}\n\n.fb_iframe_widget span {\n  \/* this is necessary for IE as well. without it, the content of the iframe would be\n   * totally off when resizing the parent window.\n   * probably related to this bug http:\/\/friendlybit.com\/css\/ie6-resize-bug\/\n   *\/\n   position: relative;\n}\n\n.fb_hide_iframes iframe {\n  position: relative;\n  left: -10000px;\n}\n.fb_iframe_widget_loader {\n  position: relative;\n  display: inline-block;\n}\n.fb_iframe_widget_loader iframe {\n  min-height: 32px;\n  z-index: 2;\n  zoom: 1;\n}\n.fb_iframe_widget_loader .FB_Loader {\n  background: url(http:\/\/static.ak.fbcdn.net\/images\/loaders\/indicator_blue_large.gif) no-repeat;\n  height: 32px;\n  width: 32px;\n  margin-left: -16px;\n  position: absolute;\n  left: 50%;\n  z-index: 4;\n}\n", ["pkg"])
