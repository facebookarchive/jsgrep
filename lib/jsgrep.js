var _ = require('underscore');
var Narcissus = require('narcissus/main');

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
 * - strictMatches: Boolean. Controls strict matching.
 * - callback: Function. Called with (node, metavariables) when any pattern
 *   matches an AST node.
 */
var jsgrep = exports.jsgrep = function(options) {
  var ast = options.source;
  if (!ast) {
    ast = require('fs').readFileSync(options.filename).toString();
  }
  if (ast instanceof String) {
    ast = Narcissus.parser.parse(ast, options.filename, 1);
  }

  var patterns = options.patterns || [ options.pattern ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i] instanceof String) {
      patterns[i] = Narcissus.parser.parse(patterns[i], 'pattern', 0);
    }
  }

  forEachNode(ast, function(node) {
    _.each(patterns, function(pattern, patternNum) {
      options.variables = {};
      if (astIsEqual(node, pattern, options)) {
        options.callback.call(null, node, options.variables);
      }
    });
  });
}

function astMatchEllipsis(nodes, patterns, config) {
  // XXX(rpatterson): this needs testing!
  const tokens = Narcissus.definitions.tokenIds;
  var permitVar = true, clonedConfig = null;
  function go(i, j) {
    if (i == nodes.length && j == patterns.length) {
      return true;
    }

    if (j == patterns.length) {
      return false;
    }

    if (patterns[j].type == tokens.ELLIPSIS && j == patterns.length - 1) {
      return true;
    }

    if(i == nodes.length) {
      return false;
    }

    if (patterns[j].type == tokens.ELLIPSIS) {
      permitVar = false;
      clonedConfig = _.clone(config);
      return go(i, j + 1) || go(i + 1, j);
    }

    return astIsEqual(nodes[i], patterns[j],
                      permitVar ? config : clonedConfig) &&
      go(i + 1, j + 1);
  }
  var result = go(0, 0);
  if (!permitVar &&
      _.keys(clonedConfig).length != _.keys(config.variables).length) {
    // ..., A, ... is ambiguous, and if A was matched later in the pattern, we
    // would have to backtrack to the ellipsis to try a different match. That's
    // annoying.
    //
    // XXX(rpatterson): This incorrectly bails for (..., A)
    throw {
      message: "Matching metavariables inside partially-matched lists is " +
        "unsupported. Sorry!"
    };
  }
  return result;
}

var astIsEqual = exports.astIsEqual = function(node, pattern, config) {
  const tokens = Narcissus.definitions.tokenIds;

  if (pattern.type == tokens.IDENTIFIER &&
      /^[A-Z](_.*)?$/.test(pattern.value)) {
    if (pattern.value in config.variables) {
      // Variable already matched, compare this node to that value
      return astIsEqual(node, config.variables[pattern.value]);
    } else {
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
        if (astIsEqual(node.children[i], keys[j], config)) {
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
    //case tokens.BLOCK:
    case tokens.CALL:
    case tokens.COMMA:
    case tokens.DELETE:
    case tokens.DOT:
    case tokens.HOOK:
    case tokens.INDEX:
    // Special
    case tokens.OBJECT_INIT:
    case tokens.PROPERTY_INIT:
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

    case tokens.ARRAY_INIT:
    case tokens.LIST:
      return astMatchEllipsis(node.children, pattern.children, config);
      break;

    case tokens.LET:
    case tokens.VAR:
      // All of var's children are IDENTIFIERs with name/initializer values
      // TODO: this does not support destructuring assignments
      if (pattern.children.length > node.children.length) {
        return false;
      }

      var keys = _.clone(pattern.children);
      for (var i = 0; i < node.children.length; i++) {
        for (var j = 0; j < keys.length;) {
          if (astIsEqual(node.children[i], keys[j], config)) {
            // If the pattern has an initializer, it must be equal to the one
            // in the source.
            if (keys[j].initializer &&
               (!node.children[i].initializer ||
                !astIsEqual(node.children[i].initializer,
                            keys[j].initializer, config))) {
              return false;
            }
            // If in strict mode and the pattern has no initializer, neither can
            // the source.
            if (!keys[j].initializer && config.strictMatches &&
                node.children[i].initializer) {
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

    //case tokens.IF:
      //forEachNode(node.condition, callback);
      //forEachNode(node.thenPart, callback);
      if (node.elsePart) {
        //forEachNode(node.elsePart, callback);
      }
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
