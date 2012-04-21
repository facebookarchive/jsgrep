// Copyright 2011 Facebook, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.var fs = require('fs');

var fs = require('fs');
var _ = require('underscore');
var Narcissus = require('../narcissus');

var createCustomError = require('./customerror').createCustomError;

var PATTERN_CACHE = { };

function Matcher(ast, options) {
  if (typeof ast === 'string') {
    ast = Narcissus.parser.parse(ast);
  }

  this.ast = ast;
  this.options = options || {};
  this.boundVars = this.options.boundVars;
  this.top = this.options.top || this;
  this.value = ast.value;

  Matcher.mangleAST(this.ast);
}
exports.Matcher = Matcher;

/**
 * Convert a string pattern into an AST suitable for matching against. This
 * methods caches patterns to speed up repeated uses of the same pattern (which
 * will happen when placing patterns inside of matcher callbacks).
 */
Matcher.compilePattern = function(pattern, filename, lineno) {
  if (typeof pattern !== 'string') {
    // It must already be compiled
    return pattern;
  }

  if (pattern in PATTERN_CACHE) {
    return PATTERN_CACHE[pattern];
  }

  var patternAst = Matcher.compilePatternNoCache(pattern, filename, lineno);
  PATTERN_CACHE[pattern] = patternAst;
  return patternAst;
};

/**
 * Convert a string pattern into an AST suitable for matching against. This
 * method bypasses the cache, which should never be necessary.
 */
Matcher.compilePatternNoCache = function(pattern, filename, lineno) {
  var patternAst = Narcissus.parser.parse(pattern, filename, lineno);
  Matcher.mangleAST(patternAst);

  if (patternAst.children.length == 1) {
    // Discard the script node
    patternAst = patternAst.children[0];
  }

  if (patternAst.type == Narcissus.definitions.tokenIds.SEMICOLON &&
      pattern.substr(pattern.length - 1) != ';') {
    // Searching for single expression, discard the semicolon node
    patternAst = patternAst.expression;
  }

  return patternAst;
};

/**
 * Returns true if the specified identifier should be treated as a metavariable.
 */
Matcher.identifierIsMetavar = function(identifier) {
  return /^[A-Z](_.*)?$/.test(identifier);
};

/**
 * Returns the original source code for the given AST node.
 *
 * @param {Narcissus.parser.Node} target
 */
Matcher.getSourceForNode = function(target) {
  if (target.removed) {
    throw new JsgrepError('Tried to get source for a removed node')
      .setSource(target.tokenizer.filename, target.lineno);
  }
  return target.tokenizer.source.substring(target.start, target.end + 1);
};

/**
 * Extracts the context lines and removed lines from the patch file and returns
 * them.
 */
Matcher.getPatternFromPatch = function(patch) {
  var pattern = [];
  var lines = patch.split('\n');
  for(var i = 0; i < lines.length; i++) {
    if (lines[i][0] == '-') {
      pattern.push(lines[i].substr(1));

    } else if (lines[i][0] == '+') {
      // So line numbers match up
      pattern.push('\n');

    } else {
      pattern.push(lines[i]);
    }
  }

  return pattern.join('\n');
};

/**
 * Modify the AST of the node to be used with jsgrep.
 */
Matcher.mangleAST = function(ast) {
  const tokens = Narcissus.definitions.tokenIds;
  // XXX(rpatterson): This is an ugly hack, necessary because if we are in a
  // property initializer, the identifier that we see isn't really an
  // identifier, it's a property name, so we need to label it as such.
  forEachNode(ast, function(node) {
    if (node.type === tokens.PROPERTY_INIT) {
      node.children[0].propertyName = true;
    }
  });
};

/**
 * Attempt to find the given pattern in the AST rooted at this Matcher. For each
 * match of the pattern, the callback will be called. If the callback does not
 * return false, the node will be considered a match.
 *
 * @returns Array of AST nodes that match.
 */
Matcher.prototype.find = function(pattern, callback, options) {
  var ret = [ ];
  var self = this;
  forEachNode(this.ast, function(node) {
    if (node.removed) {
      return;
    }
    if (self._match(node, pattern, callback, options || { })) {
      ret.push(node);
    }
  });
  return ret;
};

/**
 * Similar to Matcher.find, but finds matches strictly.
 */
Matcher.prototype.findStrict = function(pattern, callback) {
  return this.find(pattern, callback, { strictMatches: true });
};

/**
 * Determine if the AST rooted at this Matcher is a match to the given pattern.
 * If a callback is provided, it additionally must not return false in order for
 * this node to match.
 */
Matcher.prototype.match = function(pattern, callback) {
  var matchOptions = { };
  return this._match(this.ast, pattern, callback, matchOptions);
};

/**
 * Similar to Matcher.match, but this node must match strictly.
 */
Matcher.prototype.matchStrict = function(pattern, callback) {
  var matchOptions = { strictMatches: true };
  return this._match(this.ast, pattern, callback, matchOptions);
};

/**
 * Applies a patch to this matchers node, and returns the modified source code
 * fragment. The matcher must strictly match the patch pattern!
 *
 * @param {String} patch The patch chunk to apply.
 * @param {String} filename The filename corresponding to the patch file.
 * @param {Number} line The first line number of the passed chunk relative to
 *        filename.
 * @type String
 */
Matcher.prototype.getPatchedCode = function(patch, filename, line) {
  const tokens = Narcissus.definitions.tokenIds;
  const REMOVE = '!REMOVE';
  const ADD = '!ADD';
  const CONTEXT = '!CONTEXT';

  // Remove all block comments so they don't interfere, but preserve line
  // numbers
  patch = patch.replace(new RegExp('\\/\\*(.|\\n)*?\\*\\/', 'gm'),
    function(str) {
      return str.replace(/[^\n]/g, '');
    });

  patch = patch.replace(/^([-+])?/gm, function(match) {
    if (match == '-') {
      return '/*' + REMOVE + '*/';
    } else if (match == '+') {
      return '/*' + ADD + '*/';
    } else {
      return '/*' + CONTEXT + '*/';
    }
  });

  var nodeSource = Matcher.getSourceForNode(this.ast);
  var pLexer = new Narcissus.lexer.Tokenizer(patch, filename, line);
  var nLexer = new Narcissus.lexer.Tokenizer(nodeSource,
    this.ast.tokenizer.filename, this.ast.lineno);
  var t, t2, oldMode, mode = CONTEXT, removeStart, oldCursor = 0;
  var curEllip = 0, contextualParen = false;

  if (pLexer.peek() === tokens.LEFT_PAREN &&
      pLexer.lastBlockComment() == CONTEXT) {
    // A patch may be wrapped in () to put the entire patch into an expression
    // context.
    contextualParen = true;
    pLexer.get();
  }

  function modeSwitch() {
    oldMode = mode;
    mode = pLexer.lastBlockComment() || mode;

    if (mode == REMOVE && oldMode != REMOVE) {
      nLexer.skip();
      nLexer.get();
      removeStart = nLexer.token.start;
      nLexer.unget();
    }
  }

  while ((t = pLexer.get()) != tokens.END) {
    modeSwitch();
    //console.log(mode, pLexer.token.value);

    if (mode != REMOVE && oldMode == REMOVE) {
      var removedCount = nLexer.cursor - removeStart;
      nodeSource = nodeSource.substring(0, removeStart) +
                   nodeSource.substring(nLexer.cursor);
      nLexer.source = nodeSource;
      nLexer.cursor -= removedCount;
    }

    if (mode == CONTEXT || mode == REMOVE) {
      if (t == tokens.IDENTIFIER &&
          Matcher.identifierIsMetavar(pLexer.token.value) &&
          (pLexer.token.value in this.boundVars)) {
        // Skip all tokens in the bound variable
        tokenizerMatchAst(nLexer, this.boundVars[pLexer.token.value].ast);

      } else if (t == tokens.ELLIPSIS) {
        // Skip over all tokens in each expression matched by the ellipsis
        var skipNodes = this.boundVars.ellipses[curEllip++];
        _.each(skipNodes, function(n, i) {
          nLexer.match(tokens.COMMA);

          tokenizerMatchAst(nLexer, n);
        });

        if (skipNodes.length == 0) {
          // This past ellipsis had no elements, so there is no comma
          nLexer.match(tokens.COMMA);
          pLexer.match(tokens.COMMA);
          modeSwitch();
        }

      } else if (t == tokens.COMMA &&
                 pLexer.peek() == tokens.ELLIPSIS &&
                 this.boundVars.ellipses[curEllip].length == 0) {
        // The following ellipsis has no elements, so there is no comma

      } else {
        t2 = nLexer.get();
        if (t2 != t) {
          if (contextualParen && t == tokens.RIGHT_PAREN &&
              pLexer.peek() == tokens.END) {
            // Discard the matching contextual paren
          } else {
            throw new JsgrepError('Mismatch while matching context. Expected ' +
              tokenString(t) + '; found ' + tokenString(t2))
              .setSource(nLexer.filename, nLexer.lineno);
          }
        }
        if (t == tokens.IDENTIFIER || t == tokens.NUMBER ||
            t == tokens.REGEXP || t == tokens.STRING) {
          if (pLexer.token.value != nLexer.token.value) {
            throw new JsgrepError('Mismatch while matching context. ' +
              'Expected \'' + pLexer.token.value + '\'; ' +
              'found \'' + nLexer.token.value + '\'')
              .setSource(nLexer.filename, nLexer.lineno);
          }
        }
      }

      if (t == tokens.COMMA && pLexer.peek() == tokens.ELLIPSIS) {
        nLexer.skip();
      }

    } else {
      // Need to add pLexer tokens to nodeSource, update nLexer
      var replacement = pLexer.source.substring(
        pLexer.token.start, pLexer.token.end + 1);

      if (t == tokens.IDENTIFIER &&
          Matcher.identifierIsMetavar(pLexer.token.value) &&
          (pLexer.token.value in this.boundVars)) {
        replacement =
          Matcher.getSourceForNode(this.boundVars[pLexer.token.value].ast);
      }

      if (oldMode == ADD) {
        replacement =
          patch.substring(oldCursor, pLexer.token.start) + replacement;
      }

      nodeSource =
        nodeSource.substring(0, nLexer.cursor) +
        replacement +
        nodeSource.substring(nLexer.cursor);
      nLexer.source = nodeSource;
      nLexer.cursor += replacement.length;
    }

    oldCursor = pLexer.cursor;
  }

  if (mode == REMOVE) {
    var removedCount = nLexer.token.end - removeStart;
    nodeSource = nodeSource.substring(0, removeStart) +
                 nodeSource.substring(nLexer.token.end + 1);
    nLexer.source = nodeSource;
    nLexer.cursor -= removedCount;
  }

  // Remove blank lines from new code
  nodeSource = nodeSource.replace(/^\s*\n|\n*$/g, '');

  return nodeSource;
}

/**
 * Apply a single patch chunk to this matcher's node. The matcher must strictly
 * match the patch!
 */
Matcher.prototype.applyPatch = function(patch, filename, line) {
  var nodeSource = this.getPatchedCode(patch, filename, line);
  this._replaceWithString(this.ast, nodeSource);
};

/**
 * Skip over all tokens in search that are in patterns's AST, aborting if there
 * is any mismatch.
 *
 * @param search Tokenizer to skip tokens from.
 * @param pattern Node containing the tokens to skip.
 */
function tokenizerMatchAst(search, pattern) {
  const tokens = Narcissus.definitions.tokenIds;
  var pLexer = new Narcissus.lexer.Tokenizer(Matcher.getSourceForNode(pattern),
    pattern.tokenizer.filename, pattern.lineno);

  var t, t2;
  while ((t = pLexer.get()) != tokens.END) {
    if ((t2 = search.get()) != t) {
      throw new JsgrepError('Mismatch while matching context ellipsis. ' +
        'Expected ' + tokenString(t) + '; found ' + tokenString(t2))
        .setSource(search.filename, search.lineno);
    }
  }
}

Matcher.prototype._replaceWithString = function(target, replacement) {
  var start = target.start;
  var end = target.end;

  var origSource = target.tokenizer.source;
  target.tokenizer.source =
    target.tokenizer.source.substring(0, start) +
    replacement +
    target.tokenizer.source.substring(end + 1);

  var delta = replacement.length - (end - start + 1);

  forEachNode(this.top.ast, function(node) {
    if (node.removed) {
      return;
    }
    if (node.end < start) {
      // Node occurs entirely before replaced region
    } else if (end < node.start) {
      // Node occurs entirely after replaced region
      node.start += delta;
      node.end += delta;
    } else if (start <= node.start && node.end <= end) {
      // Node occurs entirely within replaced region
      node.start = 0;
      node.end = 0;
      node.removed = true;
    } else if (node.start <= start && end <= node.end) {
      // Node encapsulates the replaced region
      node.end += delta;
    } else {
      throw new JsgrepError('Replaced `' + origSource.substring(start, end + 1) +
        '` at (' + start + ', ' + end + ') but got confused on `' +
        origSource.substring(node.start, node.end + 1) +
        '` at (' + node.start + ', ' + node.end + ')')
        .setSource(node.tokenizer.filename, node.lineno);
    }
  });
};

Matcher.prototype._match = function(node, pattern, callback, matchOptions) {
  var patternAst = Matcher.compilePattern(pattern,
    matchOptions.filename, matchOptions.lineNumber);

  matchOptions.variables = {};
  if (astIsEqual(node, patternAst, matchOptions)) {
    if (callback) {
      var v = {};
      v.node = new Matcher(node, { boundVars: v, top: this.top });
      for (var i in matchOptions.variables) {
        if (matchOptions.variables[i] === matchOptions.variables.ellipses) {
          continue;
        } else if (matchOptions.variables.hasOwnProperty(i)) {
          v[i] = new Matcher(matchOptions.variables[i], {
            name: i,
            parent: v.node,
            top: this.top
          });
        }
      }
      v.ellipses = matchOptions.variables.ellipses;
      if (callback.call(null, v) === false) {
        return false;
      }
    }
    if (this.options.callback) {
      this.options.callback.call(null, node, matchOptions.variables);
    }
    return true;
  }
};

function tokenString(tt) {
  var t = Narcissus.definitions.tokens[tt];
  return /^\W/.test(t) ? Narcissus.definitions.opTypeNames[t] : t.toUpperCase();
}

/**
 * Calls 'eval' on the match script. Placed here as a global function to avoid
 * accidentally creating a closure with the user script.
 *
 * @param {String} matchScript the contents of the match script
 * @param {String} filename the path to the evaluated script
 * @type Function
 */
function evalMatchScript(matchScript, filename) {
  return eval("(function custom_matcher(jsgrep) {" + matchScript +
    '\n//@ sourceURL=' + filename + '\n})');
}

/**
 * Match a set of jsgrep patterns against an AST. Options are:
 *
 * - source: AST or String. Source to match against.
 * - filename: String. Used for errors, and to read from is source isn't given.
 * - patterns: Array of AST or String. List of patterns to match with.
 * - pattern: AST or String. Single pattern to match with.
 * - matchScript: String or Function. Either path to a file, to be evaluated as
 *   a match script, or a function which will be passed the matcher.
 * - strictMatches: Boolean. Controls strict matching (not for matchScript).
 * - callback: Function. Called with (node, metavariables) when any pattern
 *   matches an AST node.
 */
var jsgrep = exports.jsgrep = function(options) {
  var ast = options.source;
  if (!ast) {
    ast = fs.readFileSync(options.filename).toString();
  }
  if (typeof ast === 'string') {
    ast = Narcissus.parser.parse(ast, options.filename, 1);
  }

  var matcher = new Matcher(ast, { callback: options.callback });
  var matchFn;

  if (options.matchScript) {
    if (typeof options.matchScript === 'string') {
      var matchScript = fs.readFileSync(options.matchScript).toString();
      // We do this to get better syntax errors than eval gives.
      var matchAst =
        Narcissus.parser.parse(matchScript, options.matchScript, 1);

      matchFn = evalMatchScript(matchScript, options.matchScript);
    } else {
      matchFn = options.matchScript;
    }
    try {
      ast = matchFn(matcher);
    } catch(e) {
      throw new JsgrepError('Matcher threw exception')
        .setSource(ast.tokenizer.filename)
        .setCause(e);
    }

  } else {
    var patterns = options.patterns || [ options.pattern ];
    for (var i = 0; i < patterns.length; i++) {
      if (typeof patterns[i] === 'string') {
        patterns[i] = Matcher.compilePattern(patterns[i]);
      }
    }

    _.each(patterns, function(pattern) {
      if (options.strictMatches) {
        matcher.findStrict(pattern);
      } else {
        matcher.find(pattern);
      }
    });
  }
  return ast;
}

/**
 * Error type for jsgrep errors
 */
var JsgrepError = exports.JsgrepError = createCustomError('JsgrepError', null, {
  setSource: function(filename, lineno) {
    this.filename = filename;
    this.lineno = lineno;
    return this;
  },

  setCause: function(error) {
    this.cause = error;
    return this;
  },

  toString: function() {
    var result = '';
    if (this.cause) {
      result += this.cause.stack + "\n\nRethrown as ";
    }
    result += this.name + ": " + this.message;
    if (this.filename) {
      result += "\n  at " + this.filename;
      if (this.lineno) {
        result += ":" + this.lineno;
      }
    }
    if (this.detail) {
      result += "\n" + this.detail + "\n";
    }
    return result;
  }
});

/**
 * XXX(rpatterson): this needs testing!
 */
function astMatchList(nodes, patterns, config, matcher) {
  const tokens = Narcissus.definitions.tokenIds;

  if (!matcher) {
    matcher = astIsEqual;
  }

  function go(i, j) {
    if (i == nodes.length && j == patterns.length) {
      return true;
    }

    if (j == patterns.length) {
      return false;
    }

    if (patterns[j].type == tokens.ELLIPSIS && j == patterns.length - 1) {
      if (!config.variables.ellipses) {
        config.variables.ellipses = [];
      }
      config.variables.ellipses.push(
        nodes.slice(i, nodes.length));
      return true;
    }

    if(i == nodes.length) {
      return false;
    }

    if (patterns[j].type == tokens.ELLIPSIS) {
      var matched = [];
      if (!config.variables.ellipses) {
        config.variables.ellipses = [];
      }
      config.variables.ellipses.push(matched);
      // ..., A, ... is ambiguous, and if A was matched later in the pattern, we
      // would have to backtrack to the ellipsis to try a different match.
      // That's annoying.
      // XXX(rpatterson): This incorrectly bails for (..., A)
      config.failOnMetavar = true;
      try {
        var start = i, end = i;
        for (; end < nodes.length; end++) {
          if (go(end, j + 1)) {
            // splice so we modify the array that is already referenced in
            // config.variables.ellipses
            Array.prototype.splice.apply(matched,
              [0, 0].concat(nodes.slice(start, end)));
            return true;
          }
        }
        return false;
      } finally {
        config.failOnMetavar = false;
      }
    }

    return matcher(nodes[i], patterns[j], config) &&
      go(i + 1, j + 1);
  }
  var result = go(0, 0);
  return result;
}

var astIsEqual = exports.astIsEqual = function(node, pattern, config) {
  const tokens = Narcissus.definitions.tokenIds;

  // Narcissus messes up the AST when parsing [,] (no idea what [,] means)
  if (node == null && pattern == null) {
    return true;
  } else if (node == null || pattern == null) {
    return false;
  }

  if (pattern.type == tokens.IDENTIFIER &&
      Matcher.identifierIsMetavar(pattern.value)) {
    if (pattern.value in config.variables) {
      // Variable already matched, compare this node to that value
      return astIsEqual(node, config.variables[pattern.value],
        { strictMatches: true });
    } else {
      if (config.failOnMetavar) {
        throw new JsgrepError(
          "Matching metavariables inside partially-matched lists is " +
          "unsupported. Sorry!");
      }
      // Bind variable to this value
      config.variables[pattern.value] = node;
      return true;
    }
  }

  if (node.type != pattern.type) {
    return false;
  }

  if (node.type == tokens.OBJECT_INIT && !config.strictMatches) {
    // Strict matching will be handled normally (below).
    if (pattern.children.length > node.children.length) {
      return false;
    }

    var keys = _.clone(pattern.children);
    for (var i = 0; i < node.children.length; i++) {
      for (var j = 0; j < keys.length;) {
        config.failOnMetavar = true;
        var match = astIsEqual(node.children[i], keys[j], config);
        config.failOnMetavar = false;
        if (match) {
          keys.splice(j, 1);
          break;
        } else {
          j++;
        }
      }

      if (keys.length == 0) {
        break;
      }
    }

    // No keys left over -> match.
    return keys.length == 0;
  }

  switch(node.type) {
    // Core values
    case tokens.FALSE:
    case tokens.IDENTIFIER:
    case tokens.NULL:
    case tokens.NUMBER:
    case tokens.REGEXP:
    case tokens.STRING:
    case tokens.THIS:
    case tokens.TRUE:
      // propertyName shenanigans, see Matcher.mangleAST
      return node.value == pattern.value &&
        node.propertyName === pattern.propertyName;
      break;

    // 0-child statements
    case tokens.BREAK:
    case tokens.CONTINUE:
    case tokens.DEBUGGER:
      return true;
      break;

    // Unary expressions
    case tokens.BITWISE_NOT:
    case tokens.NEW:
    case tokens.NEW_WITH_ARGS:
    case tokens.NOT:
    case tokens.TYPEOF:
    case tokens.UNARY_MINUS:
    case tokens.UNARY_PLUS:
    case tokens.VOID:
    // Binary expressions
    case tokens.AND:
    case tokens.BITWISE_AND:
    case tokens.BITWISE_OR:
    case tokens.BITWISE_XOR:
    case tokens.DIV:
    case tokens.EQ:
    case tokens.GE:
    case tokens.GT:
    case tokens.IN:
    case tokens.INSTANCEOF:
    case tokens.LE:
    case tokens.LSH:
    case tokens.LT:
    case tokens.MINUS:
    case tokens.MOD:
    case tokens.MUL:
    case tokens.NE:
    case tokens.OR:
    case tokens.PLUS:
    case tokens.RSH:
    case tokens.STRICT_EQ:
    case tokens.STRICT_NE:
    case tokens.ULSH:
    case tokens.URSH:
    // Other
    case tokens.ASSIGN:
    case tokens.CALL:
    case tokens.COMMA:
    case tokens.DELETE:
    case tokens.DOT:
    case tokens.HOOK:
    case tokens.INDEX:
    // Special
    //case tokens.SCRIPT:
      if (node.children.length == pattern.children.length) {
        for (var i = 0; i < node.children.length; i++) {
          if (!astIsEqual(node.children[i], pattern.children[i], config)) {
            return false;
          }
        }
        return true;
      }
      break;

    case tokens.DECREMENT:
    case tokens.INCREMENT:
      return node.postfix === pattern.postfix &&
        astIsEqual(node.children[0], pattern.children[0], config);
      break;

    case tokens.PROPERTY_INIT:
      if (node.children.length != 2 || pattern.children.length != 2) {
        throw new JsgrepError(
          "astIsEqual: PROPERTY_INIT has more than 2 children");
      }
      // In strict mode, the ordering will prevent an ambiguous match.
      config.failOnMetavar = !config.strictMatches;
      var match = astIsEqual(node.children[0], pattern.children[0], config);
      config.failOnMetavar = false;
      if (!match) {
        return false;
      }
      return astIsEqual(node.children[1], pattern.children[1], config);
      break;

    case tokens.ARRAY_INIT:
    case tokens.BLOCK:
    case tokens.LIST:
    case tokens.OBJECT_INIT:
      return astMatchList(node.children, pattern.children, config);
      break;

    case tokens.LET:
    case tokens.VAR:
      // All of var's children are IDENTIFIERs with name/initializer values
      // TODO: this does not support destructuring assignments
      // XXX: Note that "A = B" as a pattern will *not* match "var A = B"
      if (config.strictMatches) {
        // TODO: this is using astMatchList even though the parser won't
        // accept an ellipsis in a var.
        return astMatchList(node.children, pattern.children, config,
          function(node, pattern, config) {
            if (!astIsEqual(node, pattern, config)) {
              return false;
            }

            // If the pattern has an initializer, it must be equal to the one in
            // the source.
            if (pattern.initializer && (!node.initializer ||
                !astIsEqual(node.initializer, pattern.initializer, config))) {
              return false;
            }
            // If in strict mode and the pattern has no initializer, neither can
            // the source.
            if (!pattern.initializer && config.strictMatches &&
                node.initializer) {
              return false;
            }

            return true;
        });
      } else {
        if (pattern.children.length > node.children.length) {
          return false;
        }

        var keys = _.clone(pattern.children);
        for (var i = 0; i < node.children.length; i++) {
          for (var j = 0; j < keys.length;) {
            config.failOnMetavar = true;
            var match = astIsEqual(node.children[i], keys[j], config);
            config.failOnMetavar = false;
            if (match) {
              // If the pattern has an initializer, it must be equal to the one
              // in the source.
              if (keys[j].initializer &&
                 (!node.children[i].initializer ||
                  !astIsEqual(node.children[i].initializer,
                              keys[j].initializer, config))) {
                return false;
              }
              keys.splice(j, 1);
              break;
            } else {
              j++;
            }
          }

          if (keys.length == 0) {
            break;
          }
        }

        // No keys left over -> match.
        return keys.length == 0;
      }
      break;

    case tokens.SEMICOLON:
      if (!node.expression && !pattern.expression) {
        return true;
      } else if (node.expression && pattern.expression) {
        return astIsEqual(node.expression, pattern.expression, config);
      }
      return false;
      break;

    //case tokens.DO:
      //forEachNode(node.body, callback);
      //forEachNode(node.condition, callback);
      break;

    //case tokens.WHILE:
      //forEachNode(node.condition, callback);
      //forEachNode(node.body, callback);
      break;

    //case tokens.FUNCTION:
      //forEachNode(node.body, callback);
      break;

    //case tokens.RETURN:
      if (node.value) {
        //forEachNode(node.value, callback);
      }
      break;

    //case tokens.SWITCH:
      //forEachNode(node.discriminant, callback);
      _.each(node.cases, function(child) {
        //forEachNode(child, callback);
      });
      break;

    //case tokens.DEFAULT:
      //forEachNode(node.statements, callback);
      break;

    //case tokens.CASE:
      //forEachNode(node.caseLabel, callback);
      //forEachNode(node.statements, callback);
      break;

    //case tokens.LABEL:
      //forEachNode(node.statement, callback);
      break;

    //case tokens.FOR_IN:
      //forEachNode(node.iterator, callback);
      //forEachNode(node.object, callback);
      //forEachNode(node.body, callback);
      break;

    //case tokens.FOR:
      //forEachNode(node.setup, callback);
      //forEachNode(node.condition, callback);
      //forEachNode(node.update, callback);
      //forEachNode(node.body, callback);
      break;

    case tokens.IF:
      if (!astIsEqual(node.condition, pattern.condition, config)) {
        return false;
      }
      if (!astIsEqual(node.thenPart, pattern.thenPart, config)) {
        return false;
      }
      if (config.strictMatches) {
        if (node.elsePart && pattern.elsePart) {
          return astIsEqual(node.elsePart, pattern.elsePart, config);
        }
        if (node.elsePart || pattern.elsePart) {
          return false;
        }
        return true;
      } else if (pattern.elsePart) {
        if (!node.elsePart) {
          return false;
        }
        return astIsEqual(node.elsePart, pattern.elsePart, config);
      }
      return true;
      break;

    //case tokens.TRY:
      //forEachNode(node.tryBlock, callback);
      _.each(node.catchClauses, function(child) {
        //forEachNode(child, callback);
      });
      if (node.finallyBlock) {
        //forEachNode(node.finallyBlock, callback);
      }
      break;

    //case tokens.CATCH:
      if (node.guard) {
        //forEachNode(node.guard, callback);
      }
      //forEachNode(node.block);
      break;

    case tokens.THROW:
      return astIsEqual(node.exception, pattern.exception, config);
      break;

    case tokens.WITH:
      return astIsEqual(node.object, pattern.object, config) &&
        astIsEqual(node.body, pattern.body, config);
      break;

    default:
      throw new JsgrepError(
        "Pattern type is not yet supported: " + tokenString(node.type));
      break;
  }
}

/**
 * Recursively call the callback on each node in the AST.
 *
 * @param {Narcissus.parser.Node} node The root of the AST tree being traversed.
 * @param {Function} callback Function to call on each child, recursively.
 */
var forEachNode = exports.forEachNode = function(node, callback) {
  const tokens = Narcissus.definitions.tokenIds;

  callback(node);

  if (node == null) {
    return;
  }

  switch(node.type) {
    // Core values
    case tokens.FALSE:
    case tokens.NULL:
    case tokens.NUMBER:
    case tokens.REGEXP:
    case tokens.STRING:
    case tokens.THIS:
    case tokens.TRUE:
    // 0-child statements
    case tokens.BREAK:
    case tokens.CONTINUE:
    case tokens.DEBUGGER:
    case tokens.ELLIPSIS:
      break;

    // Unary expressions
    case tokens.BITWISE_NOT:
    case tokens.DECREMENT:
    case tokens.INCREMENT:
    case tokens.NEW:
    case tokens.NEW_WITH_ARGS:
    case tokens.NOT:
    case tokens.TYPEOF:
    case tokens.UNARY_MINUS:
    case tokens.UNARY_PLUS:
    case tokens.VOID:
    // Binary expressions
    case tokens.AND:
    case tokens.BITWISE_AND:
    case tokens.BITWISE_OR:
    case tokens.BITWISE_XOR:
    case tokens.DIV:
    case tokens.EQ:
    case tokens.GE:
    case tokens.GT:
    case tokens.IN:
    case tokens.INSTANCEOF:
    case tokens.LE:
    case tokens.LSH:
    case tokens.LT:
    case tokens.MINUS:
    case tokens.MOD:
    case tokens.MUL:
    case tokens.NE:
    case tokens.OR:
    case tokens.PLUS:
    case tokens.RSH:
    case tokens.STRICT_EQ:
    case tokens.STRICT_NE:
    case tokens.ULSH:
    case tokens.URSH:
    // Other
    case tokens.ASSIGN:
    case tokens.BLOCK:
    case tokens.CALL:
    case tokens.COMMA:
    case tokens.CONST:
    case tokens.DELETE:
    case tokens.DOT:
    case tokens.HOOK:
    case tokens.INDEX:
    case tokens.LET:
    case tokens.VAR:
    // Special
    case tokens.ARRAY_INIT:
    case tokens.LIST:
    case tokens.OBJECT_INIT:
    case tokens.PROPERTY_INIT:
    case tokens.SCRIPT:
      _.each(node.children, function(child) {
        forEachNode(child, callback);
      });
      break;

    case tokens.IDENTIFIER:
      if (node.initializer) {
        forEachNode(node.initializer, callback);
      }
      break;

    case tokens.SEMICOLON:
      if (node.expression) {
        forEachNode(node.expression, callback);
      }
      break;

    case tokens.DO:
      forEachNode(node.body, callback);
      forEachNode(node.condition, callback);
      break;

    case tokens.WHILE:
      forEachNode(node.condition, callback);
      forEachNode(node.body, callback);
      break;

    case tokens.FUNCTION:
    case tokens.GETTER:
    case tokens.SETTER:
      forEachNode(node.body, callback);
      break;

    case tokens.RETURN:
      if (node.value) {
        forEachNode(node.value, callback);
      }
      break;

    case tokens.SWITCH:
      forEachNode(node.discriminant, callback);
      _.each(node.cases, function(child) {
        forEachNode(child, callback);
      });
      break;

    case tokens.DEFAULT:
      forEachNode(node.statements, callback);
      break;

    case tokens.CASE:
      forEachNode(node.caseLabel, callback);
      forEachNode(node.statements, callback);
      break;

    case tokens.LABEL:
      forEachNode(node.statement, callback);
      break;

    case tokens.FOR_IN:
      forEachNode(node.iterator, callback);
      forEachNode(node.object, callback);
      forEachNode(node.body, callback);
      break;

    case tokens.FOR:
      if (node.setup) {
        forEachNode(node.setup, callback);
      }
      if (node.condition) {
        forEachNode(node.condition, callback);
      }
      if (node.update) {
        forEachNode(node.update, callback);
      }
      forEachNode(node.body, callback);
      break;

    case tokens.IF:
      forEachNode(node.condition, callback);
      forEachNode(node.thenPart, callback);
      if (node.elsePart) {
        forEachNode(node.elsePart, callback);
      }
      break;

    case tokens.WITH:
      forEachNode(node.object, callback);
      forEachNode(node.body, callback);
      break;

    case tokens.TRY:
      forEachNode(node.tryBlock, callback);
      _.each(node.catchClauses, function(child) {
        forEachNode(child, callback);
      });
      if (node.finallyBlock) {
        forEachNode(node.finallyBlock, callback);
      }
      break;

    case tokens.CATCH:
      if (node.guard) {
        forEachNode(node.guard, callback);
      }
      forEachNode(node.block, callback);
      break;

    case tokens.THROW:
      forEachNode(node.exception, callback);
      break;

    default:
      console.error(node.toString());
      throw new JsgrepError(
        "forEachNode: Unimplemented node type " + tokenString(node.type))
        .setSource(node.tokenizer.filename, node.lineno);
      break;
  }
}
