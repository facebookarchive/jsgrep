var fs = require('fs');
var _ = require('underscore');
var Narcissus = require('narcissus/main');

var PATTERN_CACHE = { };

function Matcher(ast, options) {
  this.ast = ast;
  this.options = options || {};
  this.boundVars = this.options.boundVars;
  this.value = ast.value;

  // jsgrepDelta -> the offset (due to source modifications) of the parsed AST's
  // locations.
  // XXX: this relies on modifications happening *in source order*
  if (typeof this.ast.tokenizer.jsgrepDelta === 'undefined') {
    this.ast.tokenizer.jsgrepDelta = 0;
  }
}
exports.Matcher = Matcher;

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

Matcher.compilePatternNoCache = function(pattern, filename, lineno) {
  var patternAst = Narcissus.parser.parse(pattern, filename, lineno);

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

Matcher.identifierIsMetavar = function(identifier) {
  return /^[A-Z](_.*)?$/.test(identifier);
};

Matcher.getSourceForNode = function(target) {
  var tokenizer = target.tokenizer;
  var start = target.start + target.tokenizer.jsgrepDelta;
  var end = target.end + target.tokenizer.jsgrepDelta;
  return target.tokenizer.source.substring(start, end);
};

Matcher.prototype.find = function(pattern, callback, options) {
  var ret = [ ];
  var self = this;
  forEachNode(this.ast, function(node) {
    if (self._match(node, pattern, callback, options || { })) {
      ret.push(node);
    }
  });
  return ret;
};

Matcher.prototype.findStrict = function(pattern, callback) {
  return this.find(pattern, callback, { strictMatches: true });
};

Matcher.prototype.match = function(pattern, callback) {
  var matchOptions = { };
  return this._match(this.ast, pattern, callback, matchOptions);
};

Matcher.prototype.matchStrict = function(pattern, callback) {
  var matchOptions = { strictMatches: true };
  return this._match(this.ast, pattern, callback, matchOptions);
};

/**
 * Apply a single patch chunk to this matcher's node. The matcher must strictly
 * match the patch!
 */
Matcher.prototype.applyPatch = function(patch, filename, line) {
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
            throw {
              message: nLexer.filename + ':' + nLexer.lineno +
                ': mismatch while matching context. Expected ' +
                tokenString(t) + '; found ' + tokenString(t2)
            };
          }
        }
      }

      if (t == tokens.COMMA && pLexer.peek() == tokens.ELLIPSIS) {
        nLexer.skip();
      }

    } else {
      // Need to add pLexer tokens to nodeSource, update nLexer
      var replacement = pLexer.token.value.toString();

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
                 nodeSource.substring(nLexer.token.end);
    nLexer.source = nodeSource;
    nLexer.cursor -= removedCount;
  }

  // Remove blank lines from new code
  nodeSource = nodeSource.replace(/^\s*\n|\n*$/g, '');

  this._replaceWithString(this.ast, nodeSource);
};

function tokenizerMatchAst(lexer, v) {
  const tokens = Narcissus.definitions.tokenIds;
  var vLexer = new Narcissus.lexer.Tokenizer(Matcher.getSourceForNode(v),
    v.tokenizer.filename, v.lineno);

  var t, t2;
  while ((t = vLexer.get()) != tokens.END) {
    if ((t2 = lexer.get()) != t) {
      throw {
        message: lexer.filename + ':' + lexer.lineno +
          ': mismatch while matching context ellipsis. Expected ' +
          tokenString(t) + '; found ' + tokenString(t2)
      };
    }
  }
}

Matcher.prototype._replaceWithString = function(target, replacement) {
  if (!target.tokenizer.jsgrepDelta) {
    target.tokenizer.jsgrepDelta = 0;
  }

  var start = target.start + target.tokenizer.jsgrepDelta;
  var end = target.end + target.tokenizer.jsgrepDelta;

  target.tokenizer.source =
    target.tokenizer.source.substring(0, start) +
    replacement +
    target.tokenizer.source.substring(end);
  target.tokenizer.jsgrepDelta += replacement.length - (end - start);
  target = target.tokenizer.source.substring(start, end);
};

Matcher.prototype._match = function(node, pattern, callback, matchOptions) {
  var patternAst = Matcher.compilePattern(pattern,
    matchOptions.filename, matchOptions.lineNumber);

  matchOptions.variables = {};
  if (astIsEqual(node, patternAst, matchOptions)) {
    if (callback) {
      var v = {};
      v.node = new Matcher(node, { boundVars: v });
      for (var i in matchOptions.variables) {
        if (matchOptions.variables[i] === matchOptions.variables.ellipses) {
          continue;
        } else if (matchOptions.variables.hasOwnProperty(i)) {
          v[i] = new Matcher(matchOptions.variables[i], {
            name: i,
            parent: v.node
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
      try {
        var matchAst =
          Narcissus.parser.parse(matchScript, options.matchScript, 1);
      } catch(e) {
        throw {
          message: e.name + ": " + e.message
        };
      }

      matchFn = eval("(function custom_matcher(jsgrep) {" + matchScript + "})");
    } else {
      matchFn = options.matchScript;
    }
    try {
      matchFn(matcher);
    } catch(e) {
      if (e instanceof Error) {
        throw {
          message: 'Matcher threw exception\n' + e.stack
        };
      } else {
        throw e;
      }
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
}

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
        throw {
          message: "Matching metavariables inside partially-matched lists is " +
            "unsupported. Sorry!"
        };
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
      return node.value == pattern.value;
      break;

    // 0-child statements
    case tokens.BREAK:
    case tokens.CONTINUE:
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
        throw {
          message: "astIsEqual: Unsupported PROPERTY_INIT"
        };
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

    default:
      throw {
        message: "Pattern type is not yet supported: " + tokenString(node.type)
      };
      break;
  }
}

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
      throw {
        message: "forEachNode: " + node.tokenizer.filename + ":" + node.lineno +
          ": Unimplemented node type " + tokenString(node.type)
      };
      break;
  }
}
