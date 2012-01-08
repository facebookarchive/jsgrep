#!/usr/bin/env node

var fs = require('fs');
var cli = require('cli');
var _ = require('underscore');

var Narcissus = require('narcissus/main');

cli.setUsage(cli.app + ' [OPTIONS] FILES');
cli.parse({
  pattern: [ 'e', 'Pattern to search for, must be valid JavaScript', 'string' ],
  print: [ 'p', 'Instead of printing the matching line, print the matching ' +
                'variable', 'string' ],
  'dump-ast': [ false, 'Instead of searching, dump the AST for the pattern' ]
});

var pattern = cli.options.pattern;
var patternAst = Narcissus.parser.parse(pattern, 'pattern', 0);
if (patternAst.children.length == 1) {
  // Discard the script node
  patternAst = patternAst.children[0];
}

if (patternAst.type == Narcissus.definitions.tokenIds.SEMICOLON &&
    pattern.substr(pattern.length - 1) != ';') {
  // Searching for single expression, discard the semicolon node
  patternAst = patternAst.expression;
}

if (cli.options['dump-ast']) {
  console.log(patternAst.toString());
  process.exit(0);
}

for (var i = 0; i < cli.args.length; i++) {
  var source = fs.readFileSync(cli.args[i]).toString();
  // If the first character is a shebang, comment it out
  if (source.substr(0, 2) == '#!') {
    source = "// " + source;
  }
  var sourceLines = source.split('\n');
  try {
    var ast = Narcissus.parser.parse(source, cli.args[i], 1);
  } catch(e) {
    console.warn(e.message);
  }

  forEachNode(ast, function(node) {
    var variables = {};
    if (astIsEqual(node, patternAst, variables)) {
      var output = sourceLines[node.lineno - 1];
      if (cli.options['print']) {
        var matchNode = variables[cli.options.print];
        output = matchNode.tokenizer.source.substring(
          matchNode.start, matchNode.end);
      }
      console.log(cli.args[i] + ": " + output);
    }
  });
}

function tokenString(tt) {
  var t = Narcissus.definitions.tokens[tt];
  return /^\W/.test(t) ? Narcissus.definitions.opTypeNames[t] : t.toUpperCase();
}

function astIsEqual(node, pattern, variables) {
  const tokens = Narcissus.definitions.tokenIds;

  if (pattern.type == tokens.IDENTIFIER &&
      /^[A-Z](_.*)?$/.test(pattern.value)) {
    if (pattern.value in variables) {
      // Variable already matched, compare this node to that value
      return astIsEqual(node, variables[pattern.value]);
    } else {
      // Bind variable to this value
      variables[pattern.value] = node;
      return true;
    }
  }

  if (node.type != pattern.type) {
    return false;
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
    //case tokens.COMMA:
    case tokens.DELETE:
    case tokens.DOT:
    case tokens.HOOK:
    case tokens.INDEX:
    //case tokens.LET:
    //case tokens.VAR:
    // Special
    case tokens.ARRAY_INIT: // TODO: handle ...
    case tokens.LIST: // TODO: handle ...
    case tokens.OBJECT_INIT: // TODO: handle ... and partial object matching
    case tokens.PROPERTY_INIT:
    //case tokens.SCRIPT:
      if (node.children.length == pattern.children.length) {
        for (var i = 0; i < node.children.length; i++) {
          if (!astIsEqual(node.children[i], pattern.children[i], variables)) {
            return false;
          }
        }
        return true;
      }
      break;

    case tokens.SEMICOLON:
      if (!node.expression && !pattern.expression) {
        return true;
      } else if (node.expression && pattern.expression) {
        return astIsEqual(node.expression, pattern.expression, variables);
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

    //case tokens.THROW:
      //forEachNode(node.exception, callback);
      break;

    default:
      cli.fatal("Pattern type is not yet supported: " + tokenString(node.type));
      break;
  }
}

function forEachNode(node, callback) {
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
      cli.fatal("forEachNode: " +
        node.tokenizer.filename + ":" + node.lineno +
        ": Unimplemented node type");
      break;
  }
}
