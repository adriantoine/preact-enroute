(function (preact) {
'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var __moduleExports$1 = createCommonjsModule(function (module) {
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};
});

var __moduleExports = createCommonjsModule(function (module) {
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var isarray = __moduleExports$1;

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp;
module.exports.parse = parse;
module.exports.compile = compile;
module.exports.tokensToFunction = tokensToFunction;
module.exports.tokensToRegExp = tokensToRegExp;

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
// Match escaped characters that would otherwise appear in future matches.
// This allows the user to escape special characters that won't transform.
'(\\\\.)',
// Match Express-style parameters and un-named parameters with a prefix
// and optional suffixes. Matches appear as:
//
// "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
// "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
// "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
'([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string} str
 * @return {!Array}
 */
function parse(str) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var res;

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      continue;
    }

    var next = str[index];
    var prefix = res[2];
    var name = res[3];
    var capture = res[4];
    var group = res[5];
    var modifier = res[6];
    var asterisk = res[7];

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
    }

    var partial = prefix != null && next != null && next !== prefix;
    var repeat = modifier === '+' || modifier === '*';
    var optional = modifier === '?' || modifier === '*';
    var delimiter = res[2] || '/';
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      asterisk: !!asterisk,
      pattern: escapeGroup(pattern)
    });
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index);
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path);
  }

  return tokens;
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @return {!function(Object=, Object=)}
 */
function compile(str) {
  return tokensToFunction(parse(str));
}

/**
 * Prettier encoding of URI path segments.
 *
 * @param  {string}
 * @return {string}
 */
function encodeURIComponentPretty(str) {
  return encodeURI(str).replace(/[\/?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

/**
 * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
 *
 * @param  {string}
 * @return {string}
 */
function encodeAsterisk(str) {
  return encodeURI(str).replace(/[?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction(tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length);

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (_typeof(tokens[i]) === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$');
    }
  }

  return function (obj, opts) {
    var path = '';
    var data = obj || {};
    var options = opts || {};
    var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        path += token;

        continue;
      }

      var value = data[token.name];
      var segment;

      if (value == null) {
        if (token.optional) {
          // Prepend partial segment prefixes.
          if (token.partial) {
            path += token.prefix;
          }

          continue;
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined');
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`');
        }

        if (value.length === 0) {
          if (token.optional) {
            continue;
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty');
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j]);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`');
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment;
        }

        continue;
      }

      segment = token.asterisk ? encodeAsterisk(value) : encode(value);

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"');
      }

      path += token.prefix + segment;
    }

    return path;
  };
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1');
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup(group) {
  return group.replace(/([=!:$\/()])/g, '\\$1');
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {!RegExp} re
 * @param  {Array}   keys
 * @return {!RegExp}
 */
function attachKeys(re, keys) {
  re.keys = keys;
  return re;
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags(options) {
  return options.sensitive ? '' : 'i';
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {!Array}  keys
 * @return {!RegExp}
 */
function regexpToRegexp(path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      });
    }
  }

  return attachKeys(path, keys);
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array}   keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function arrayToRegexp(path, keys, options) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

  return attachKeys(regexp, keys);
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {!Array}  keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function stringToRegexp(path, keys, options) {
  var tokens = parse(path);
  var re = tokensToRegExp(tokens, options);

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i]);
    }
  }

  return attachKeys(re, keys);
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Object=} options
 * @return {!RegExp}
 */
function tokensToRegExp(tokens, options) {
  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var route = '';
  var lastToken = tokens[tokens.length - 1];
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      var prefix = escapeString(token.prefix);
      var capture = '(?:' + token.pattern + ')';

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*';
      }

      if (token.optional) {
        if (!token.partial) {
          capture = '(?:' + prefix + '(' + capture + '))?';
        } else {
          capture = prefix + '(' + capture + ')?';
        }
      } else {
        capture = prefix + '(' + capture + ')';
      }

      route += capture;
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }

  return new RegExp('^' + route, flags(options));
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {(Array|Object)=}       keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp(path, keys, options) {
  keys = keys || [];

  if (!isarray(keys)) {
    options = /** @type {!Object} */keys;
    keys = [];
  } else if (!options) {
    options = {};
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, /** @type {!Array} */keys);
  }

  if (isarray(path)) {
    return arrayToRegexp( /** @type {!Array} */path, /** @type {!Array} */keys, options);
  }

  return stringToRegexp( /** @type {string} */path, /** @type {!Array} */keys, options);
}
});

var __moduleExports$2 = createCommonjsModule(function (module) {
'use strict';
/* eslint-disable no-unused-vars */

var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc'); // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};
});

var index = createCommonjsModule(function (module) {
/**
 * Module Dependencies
 */

var Regexp = __moduleExports;
var assign = __moduleExports$2;

/**
 * Export `Enroute`
 */

module.exports = Enroute;

/**
 * Create `enroute`
 *
 * @param {Object} routes
 * @return {Function}
 */

function Enroute(routes) {
  return function enroute(location, props) {
    if (!location) throw new Error('enroute requires a location');
    props = props || {};
    var params = {};

    for (var route in routes) {
      var m = match(route, params, location);
      var fn = routes[route];

      if (m) {
        if (typeof fn !== 'function') return fn;else return fn(params, props);
      }
    }

    return null;
  };
}

/**
 * Check if this route matches `path`, if so
 * populate `params`.
 *
 * @param {String} path
 * @param {Object} params
 * @return {Boolean}
 * @api private
 */

function match(path, params, pathname) {
  var keys = [];
  var regexp = Regexp(path, keys);
  var m = regexp.exec(pathname);

  if (!m) return false;else if (!params) return true;

  for (var i = 1, len = m.length; i < len; ++i) {
    var key = keys[i - 1];
    var val = 'string' == typeof m[i] ? decodeURIComponent(m[i]) : m[i];
    if (key) params[key.name] = val;
  }

  return true;
}
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass$1 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn$1(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits$1(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function assert(e, msg) {
	if (e === null || e === undefined || e === false) {
		throw new Error('preact-enroute: ' + msg);
	}
}

/**
 * Router routes things.
 */

var Router = function (_Component) {
	_inherits$1(Router, _Component);

	/**
  * Initialize the router.
  */

	function Router(props) {
		_classCallCheck$1(this, Router);

		var _this = _possibleConstructorReturn$1(this, (Router.__proto__ || Object.getPrototypeOf(Router)).call(this, props));

		_this.routes = {};

		_this.addRoutes(props.children);
		_this.router = index(_this.routes);
		return _this;
	}

	/**
  * Add routes.
  */

	_createClass$1(Router, [{
		key: 'addRoutes',
		value: function addRoutes(routes, parent) {
			var _this2 = this;

			routes.forEach(function (r) {
				return _this2.addRoute(r, parent);
			});
		}

		/**
   * Add route.
   */

	}, {
		key: 'addRoute',
		value: function addRoute(el, parent) {
			var _props = this.props;
			var location = _props.location;

			var props = _objectWithoutProperties(_props, ['location']);

			var _el$attributes = el.attributes;
			var path = _el$attributes.path;
			var component = _el$attributes.component;

			var children = el.children;

			assert(typeof path === 'string', 'Route ' + context(el.attributes) + 'is missing the "path" property');
			assert(component, 'Route ' + context(el.attributes) + 'is missing the "component" property');

			function render(params, renderProps) {
				var finalProps = _extends({}, props, renderProps, { location: location, params: params });
				var children = preact.h(component, finalProps);
				return parent ? parent.render(params, { children: children }) : children;
			}

			var route = normalizeRoute(path, parent);
			if (children) {
				this.addRoutes(children, { route: route, render: render });
			}

			this.routes[cleanPath(route)] = render;
		}

		/**
   * Render the matching route.
   */

	}, {
		key: 'render',
		value: function render() {
			var location = this.props.location;

			assert(location, 'Router "location" property is missing');
			return this.router(location, { children: null });
		}
	}]);

	return Router;
}(preact.Component);

/**
 * Route does absolutely nothing :).
 */

function Route() {
	assert(false, 'Route should not be rendered');
}

/**
 * Context string for route errors based on the props available.
 */

function context(_ref) {
	var path = _ref.path;
	var component = _ref.component;

	if (path) {
		return 'with path "' + path + '" ';
	}
	if (component) {
		return 'with component ' + component.name + ' ';
	}
	return '';
}

/**
 * Normalize route based on the parent.
 */

function normalizeRoute(path, parent) {
	if (path[0] === '/' || path[0] === '') {
		return path; // absolute route
	}
	if (!parent) {
		return path; // no need for a join
	}
	return parent.route + '/' + path; // join
}

/**
 * Clean path by stripping subsequent "//"'s. Without this
 * the user must be careful when to use "/" or not, which leads
 * to bad UX.
 */

function cleanPath(path) {
	return path.replace(/\/\//g, '/');
}

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var state = {
	location: window.location.pathname,
	users: [{ id: 1, name: 'Bob' }, { id: 2, name: 'Joe' }],
	pets: [{ id: 1, userId: 1, name: 'Tobi', species: 'Ferret' }, { id: 2, userId: 1, name: 'Loki', species: 'Ferret' }, { id: 3, userId: 1, name: 'Jane', species: 'Ferret' }, { id: 4, userId: 2, name: 'Manny', species: 'Cat' }, { id: 5, userId: 2, name: 'Luna', species: 'Cat' }]
};

// note this is just an example, this package does not provide
// a Link equivalent found in react-router, nor does it provide
// bindings for tools like Redux. You'll need to wire these up
// as desired.
function Link(_ref, _ref2) {
	var to = _ref.to;
	var children = _ref.children;
	var navigate = _ref2.navigate;

	function click(e) {
		e.preventDefault();
		history.pushState(null, '', to);
		navigate(to);
	}

	return preact.h(
		'a',
		{ href: to, onClick: click },
		children
	);
}

var User = function User(_ref3) {
	var user = _ref3.user;
	var pets = _ref3.pets;

	return preact.h(
		'div',
		null,
		preact.h(
			'p',
			null,
			user.name,
			' has ',
			pets.length,
			' pets:'
		),
		preact.h(
			'ul',
			null,
			pets.map(function (pet) {
				return preact.h(
					'li',
					{ key: pet.id },
					preact.h(
						Link,
						{ to: '/pets/' + pet.id },
						pet.name
					)
				);
			})
		)
	);
};

User = function (fn) {
	return function (_ref4) {
		var users = _ref4.users;
		var pets = _ref4.pets;
		var id = _ref4.params.id;

		return fn({
			user: users.filter(function (u) {
				return u.id === parseInt(id, 10);
			})[0],
			pets: pets.filter(function (p) {
				return p.userId === parseInt(id, 10);
			})
		});
	};
}(User);

function Pets(_ref5) {
	var pets = _ref5.pets;
	var children = _ref5.children;

	return preact.h(
		'div',
		null,
		preact.h(
			'h2',
			null,
			'Pets'
		),
		preact.h(
			'ul',
			null,
			pets.map(function (pet) {
				return preact.h(
					'li',
					{ key: pet.id },
					preact.h(
						Link,
						{ to: '/pets/' + pet.id },
						pet.name
					)
				);
			})
		),
		children
	);
}

var Pet = function Pet(_ref6) {
	var user = _ref6.user;
	var pet = _ref6.pet;

	return preact.h(
		'p',
		null,
		pet.name,
		' is a ',
		pet.species,
		' and is owned by ',
		preact.h(
			Link,
			{ to: '/users/' + user.id },
			user.name
		),
		'.'
	);
};

Pet = function (fn) {
	return function (_ref7) {
		var users = _ref7.users;
		var pets = _ref7.pets;
		var id = _ref7.params.id;

		var pet = pets.filter(function (p) {
			return p.id === parseInt(id, 10);
		})[0];
		var user = users.filter(function (u) {
			return u.id === pet.userId;
		})[0];
		return fn({ user: user, pet: pet });
	};
}(Pet);

function NotFound() {
	return preact.h(
		'p',
		null,
		'404 Not Found'
	);
}

var Index = function Index(_ref8) {
	var children = _ref8.children;

	return preact.h(
		'div',
		null,
		preact.h(
			'h1',
			null,
			'Pet List'
		),
		preact.h(
			'p',
			null,
			'At least it is not a to-do list. Check out ',
			preact.h(
				Link,
				{ to: '/users' },
				'users'
			),
			' or ',
			preact.h(
				Link,
				{ to: '/pets' },
				'pets'
			),
			'.'
		),
		children
	);
};

var Users = function Users(_ref9) {
	var users = _ref9.users;
	var children = _ref9.children;

	return preact.h(
		'div',
		null,
		preact.h(
			'h2',
			null,
			'Users'
		),
		preact.h(
			'ul',
			null,
			users.map(function (user) {
				return preact.h(
					'li',
					{ key: user.id },
					preact.h(
						Link,
						{ to: '/users/' + user.id },
						user.name
					)
				);
			})
		),
		children
	);
};

var App = function (_Component) {
	_inherits(App, _Component);

	function App() {
		_classCallCheck(this, App);

		var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this));

		_this.state = state;
		return _this;
	}

	_createClass(App, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this2 = this;

			window.addEventListener('popstate', function () {
				_this2.setState({ location: window.location.pathname });
			});
		}
	}, {
		key: 'getChildContext',
		value: function getChildContext() {
			var _this3 = this;

			return {
				navigate: function navigate(path) {
					return _this3.setState({ location: path });
				}
			};
		}
	}, {
		key: 'render',
		value: function render() {
			return preact.h(
				Router,
				this.state,
				preact.h(Route, { path: '/', component: Index }),
				preact.h(Route, { path: '/users', component: Users }),
				preact.h(Route, { path: '/users/:id', component: User }),
				preact.h(Route, { path: '/pets', component: Pets }),
				preact.h(Route, { path: '/pets/:id', component: Pet }),
				preact.h(Route, { path: '*', component: NotFound })
			);
		}
	}]);

	return App;
}(preact.Component);

preact.render(preact.h(App, null), document.body);

}(preact));
//# sourceMappingURL=bundle.js.map
